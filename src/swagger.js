import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "ECOM Multi-vendor API",
    description: "Auto-generated API documentation"
  },
  host: "localhost:5000",
  schemes: ["http"]
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./src/server.js", "./src/routes/*.js"];

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated!");
});
