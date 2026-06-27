# 08 历史记录与撤销重做

**文件位置：** `source/editor/history/`

## 1. 整体架构

```
Editor.history (History)
  └── actions[] (Action 数组)
       ├── [0] ChangeAction("修改名称")
       ├── [1] ActionBundle([AddAction, AddResourceAction])
       ├── [2] ChangeAction("修改位置")
       ├── ... position ← 当前指针
       └── [n] ...

Ctrl+Z (undo) → position--，调用 actions[position].revert()
Ctrl+Y (redo) → position++，调用 actions[position].apply()
```

## 2. History.js — 历史管理器

`source/editor/history/History.js`

| 方法 | 功能 |
|------|------|
| `add(action)` | 添加操作，自动 apply。如果不在末尾则截断后续 |
| `undo()` | 撤销：调用 actions[position].revert()，position-- |
| `redo()` | 重做：position++，调用 actions[position].apply() |
| `getAction(id)` | 按 ID 查找操作 |

配置：
- `limit` — 最大历史记录数量（默认 50，可在 Settings 中修改为 `historySize`）
- 超出限制时从头部删除最旧的记录

## 3. Action 体系

### 3.1 Action 基类

`source/editor/history/action/Action.js`

所有操作的基类，定义接口：

```javascript
function Action() {
  this.id = Action.id++;  // 全局自增 ID
}

Action.prototype.apply = function() {};   // 执行操作
Action.prototype.revert = function() {};  // 撤销操作
```

### 3.2 ChangeAction — 属性变更

`source/editor/history/action/ChangeAction.js`

最常用的 Action，记录对象的单个属性变更：

```javascript
function ChangeAction(object, attribute, newValue) {
  Action.call(this);
  this.object = object;
  this.attribute = attribute;
  this.oldValue = object[attribute];  // 记录旧值
  this.newValue = newValue;
}

ChangeAction.prototype.apply = function() {
  this.object[this.attribute] = this.newValue;
};

ChangeAction.prototype.revert = function() {
  this.object[this.attribute] = this.oldValue;
};
```

使用示例（遍布整个 Inspector 系统）：
```javascript
this.name.setOnChange(function() {
  Editor.addAction(new ChangeAction(self.object, "name", self.name.getText()));
});
```

### 3.3 ActionBundle — 操作组合

`source/editor/history/action/ActionBundle.js`

将多个 Action 组合为一个原子操作（全部一起 apply/revert）：

```javascript
function ActionBundle(actions) {
  Action.call(this);
  this.actions = actions;
}

ActionBundle.prototype.apply = function() {
  for (var i = 0; i < this.actions.length; i++) {
    this.actions[i].apply();
  }
};

ActionBundle.prototype.revert = function() {
  for (var i = this.actions.length - 1; i >= 0; i--) {
    this.actions[i].revert();  // 逆序撤销
  }
};
```

典型场景：添加对象时同时注册其携带的资源：
```javascript
Editor.addAction(new ActionBundle([
  new AddAction(mesh, scene),
  new AddResourceAction(material, program, "materials"),
  new AddResourceAction(texture, program, "textures")
]));
```

### 3.4 CallbackAction — 回调操作

`source/editor/history/action/CallbackAction.js`

通过回调函数定义 apply/revert 行为，适用于无法用简单属性赋值表达的操作。

### 3.5 对象操作 (action/objects/)

| Action | 功能 |
|--------|------|
| `AddAction(object, parent)` | 添加对象到场景树 |
| `RemoveAction(object)` | 从场景树移除对象 |
| `MoveAction(object, newParent, newIndex)` | 移动对象（改变父节点或排序） |
| `SwapAction(oldObject, newObject)` | 替换对象（保持位置和子节点） |

**AddAction**：
```
apply:  parent.add(object)  // Three.js scene graph
revert: parent.remove(object)
```

**RemoveAction**：
```
apply:  记录 parent + index → parent.remove(object)
revert: parent.children.splice(index, 0, object)  // 恢复原位
```

**MoveAction**：
```
apply:  记录旧 parent/index → oldParent.remove → newParent.add
revert: newParent.remove → oldParent.children.splice(oldIndex, 0, object)
```

**SwapAction**：
```
apply:  parent.remove(old) → parent.add(new), 拷贝 transform
revert: parent.remove(new) → parent.add(old)
```

### 3.6 资源操作 (action/resources/)

| Action | 功能 |
|--------|------|
| `AddResourceAction(resource, program, category)` | 注册资源到 ResourceManager |
| `RemoveResourceAction(resource, program, category)` | 从 ResourceManager 移除 |
| `SwapResourceAction(oldResource, newResource, program, category)` | 替换资源引用 |

```
AddResourceAction.apply:   program[category][resource.uuid] = resource
AddResourceAction.revert:  delete program[category][resource.uuid]
```

## 4. ResourceCrawler — 资源爬取器

`source/editor/history/ResourceCrawler.js`

当向场景添加对象时，需要同步注册其依赖的所有资源。ResourceCrawler 递归遍历对象及其子节点，提取出所有引用的资源：

```
ResourceCrawler.searchObject(object, program)
  → 遍历 object + 所有 children
    → 检查 material → 提取到 materials{}
    → 检查 material.map/normalMap/... → 提取关联 Texture 到 textures{}
    → 检查 Texture.imageResource → 提取 Image 到 images{}
    → 检查 geometry → 提取到 geometries{}
  → 返回 { materials, textures, images, geometries, ... }
```

这确保了 AddAction 始终伴随所有必要的 AddResourceAction，保证场景树和资源库的一致性。

## 5. 数据一致性保证

### 5.1 原子性

ActionBundle 确保多个操作要么全部执行，要么全部撤销。

### 5.2 引用完整性

添加对象时 ResourceCrawler 自动发现并注册所有依赖资源。删除对象时检查资源是否还被其他对象引用，如果是最后一个引用则同时删除资源。

### 5.3 历史截断

当用户撤销若干步后进行新操作，被撤销的操作（position 之后的）会被丢弃。这是标准的线性历史模型。
