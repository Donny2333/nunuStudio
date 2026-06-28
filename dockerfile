FROM node:16.15.0

RUN mkdir /istudio
COPY . /istudio
WORKDIR /istudio

RUN npm install --legacy-peer-deps
RUN npm run napa

EXPOSE 8081

ENV HOST=0.0.0.0
ENV PORT=8081

RUN npm run build-editor

CMD ["npm", "run", "start-docker" ]
