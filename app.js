const Hapi = require("@hapi/hapi");

const { getProducts, addProduct, updateProduct, deleteProduct } = require("./controllers/productController");
const { validateRequestPayload } = require("./utils/joiValidator");

const payload = {
  parse: true,
  multipart: {
    output: "stream",
  },
  maxBytes: 1000 * 1000 * 5,
};

//Init Server
const server = new Hapi.Server({
  port: 4000,
  host: "localhost",
});

const provision = async () => {
  //Plugin Register
  await server.register([{ plugin: require("inert") }]);

  server.route({
    method: "GET",
    path: "/uploads/{file}",
    handler: {
      directory: {
        path: "public/uploads/",
      },
    },
  });

  server.route({
    path: "/",
    method: "GET",
    handler: (req, h) => `<h1>THIS IS HOME PAGE.</h1>`,
  });

  //GET PRODUCTS
  server.route({
    path: "/products",
    method: "GET",
    handler: async (req, h) => getProducts(req, h),
  });

  //ADD PRODUCT
  server.route({
    path: "/product",
    method: "POST",
    options: {
      validate: {
        payload: validateRequestPayload([
          "name",
          "description",
          "price",
          "quantity",
          "image",
        ]),
      },
      payload,
    },
    handler: async (req, h) => addProduct(req, h),
  });

  //UPDATE PRODUCT
  server.route({
    path: "/product",
    method: "PUT",
    options: {
      validate: {
        payload: validateRequestPayload(["_id"], true),
      },
      payload,
    },
    handler: async (req, h) => updateProduct(req, h),
  });

  //DELETE PRODUCT
  server.route({
    path: "/product",
    method: "DELETE",
    options: {
      validate: {
        payload: validateRequestPayload(["_id", "_rev"]),
      },
    },
    handler: async (req, h) => deleteProduct(req, h),
  });

  //Start Server
  await server.start((err) => {
    if (err) throw err;
    console.log("server is listening at", server.info.uri);
  });
};

provision();
