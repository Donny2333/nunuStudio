# MVP 计划 — 集成 @takram/three-geospatial

## 目标

TilesetObject 使用 three-geospatial 的坐标系统，支持：
1. 经纬度定位瓦片（WGS84 → 场景坐标）
2. 地球椭球体参考，瓦片按真实地理位置放置
3. 编辑器中可通过经纬度导航相机

## 前置条件

- Three.js r167 → r170+（three-geospatial 要求 >= 0.170.0）
- 安装 `@takram/three-geospatial@^0.9.1`

---

## Phase 1：Three.js r167 → r170 升级（1 天） ✅ 已完成

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1.1 | `npm install three@0.170.0` | ✅ |
| 1.2 | 修复 r167→r170 breaking changes（查阅 changelog） | ✅ 无 breaking changes |
| 1.3 | webpack 编译通过 + 编辑器启动无报错 | ✅ |

**结果：** r167→r170 无 breaking changes，编译零错误，编辑器正常启动。

---

## Phase 2：集成 three-geospatial 核心（1 天） ✅ 已完成

| 步骤 | 内容 | 状态 |
|------|------|------|
| 2.1 | `npm install @takram/three-geospatial` （忽略 React peer dep warning） | ✅ |
| 2.2 | 新建 `source/core/geo/GeoUtils.js` — 封装坐标转换 | ✅ |
| 2.3 | 使用 `TilingScheme` + `Geodetic` 实现 `lngLatToTile/lngLatToECEF` | ✅ |
| 2.4 | TilesetObject 改用 GeoUtils 定位瓦片（替代当前硬编码偏移） | ✅ |

**结果：**
- GeoUtils.js 封装了 `lngLatToTile`, `lngLatToECEF`, `ecefToLngLat`, `tileToLngLat`
- TilesetObject 使用 `GeoUtils.lngLatToTile()` 替代硬编码的 `lonToTileX/latToTileY`
- webpack 需要 `"three/addons"` alias 指向 `three/examples/jsm`（three-geospatial 依赖）
- 编辑器无报错，256 瓦片正常加载渲染

---

## Phase 3：地理相机 Controls（1 天） ✅ 已完成

| 步骤 | 内容 | 状态 |
|------|------|------|
| 3.1 | Inspector 面板添加 "Go to Location" 按钮 | ✅ |
| 3.2 | 点击跳转相机到 TilesetObject 正上方（近顶视角） | ✅ |
| 3.3 | 相机高度与 zoom 级别联动（`zoomToDistance` 公式） | ✅ |
| 3.4 | 复用 EditorOrbitControls（无需新建独立控制器） | ✅ |

**结果：**
- 在 TilesetObjectInspector 添加 "Go to Location" 按钮
- 点击后通过 `Editor.gui.tab.getActiveTab()` 获取当前 SceneEditor 的 controls
- 设置 controls.center 为 tileset 世界坐标，orientation 为俯视角(1.2rad)
- `zoomToDistance(zoom)` 将 zoom 级别映射为合适的相机距离

---

## MVP 验证标准

| 步骤 | 验收 | 状态 |
|------|------|------|
| Three.js r170 编辑器启动 | 无报错 | ✅ |
| 添加 TilesetObject | 卫星影像渲染 | ✅ 256瓦片加载成功 |
| 修改经纬度 → 瓦片正确更新 | 地理位置准确 | ✅ GeoUtils.lngLatToTile |
| 相机跳转到指定经纬度 | 视口定位正确 | ✅ Go to Location 按钮 |

**MVP 已全部完成。**

---

## 不在 MVP 范围

- 地球曲率渲染（平面近似足够）
- 3D Tiles（OGC）支持
- 大气散射效果（@takram/three-atmosphere）
- 多数据源切换 UI
- 地形高程
