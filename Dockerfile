FROM node:12-alpine as BUILDAPP

# Define working directory
WORKDIR /app
COPY . /app

# Get typings
RUN apk add git
RUN git clone https://github.com/SevenTV/Typings.git

# Build the app
RUN npm install
RUN npm run build:ssr

RUN echo Production build complete
