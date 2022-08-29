const Joi = require("joi");

exports.validateRequestPayload = (keysArr, allowUnknown = false) => {
  const validationObject = createValidationObject(keysArr);
  return allowUnknown
    ? Joi.object(validationObject).options({ allowUnknown })
    : Joi.object(validationObject);
};

const createValidationObject = (keysArr = []) => {
  let validationObject = {};

  keysArr.forEach((key) => {
    switch (key) {
      case "name":
        Object.assign(validationObject, {
          name: Joi.string().min(3).required(),
        });
        break;
      case "description":
        Object.assign(validationObject, {
          description: Joi.string().min(5).required(),
        });
        break;
      case "price":
        Object.assign(validationObject, { price: Joi.number().required() });
        break;
      case "quantity":
        Object.assign(validationObject, {
          quantity: Joi.number().integer(),
        });
        break;
      case "image":
        Object.assign(validationObject, { image: Joi.any().required() });
        break;
      case "_id":
        Object.assign(validationObject, { _id: Joi.string().required() });
        break;
      case "_rev":
        Object.assign(validationObject, { _rev: Joi.string().required() });
        break;
      default:
        return;
    }
  });
  return validationObject;
};