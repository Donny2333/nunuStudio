FROM node:20

RUN mkdir /istudio
COPY . /istudio
WORKDIR /istudio

RUN npm install --legacy-peer-deps

EXPOSE 8081

ENV HOST=0.0.0.0
ENV PORT=8081

RUN npm run build-editor

CMD ["npm", "run", "start-docker" ]
