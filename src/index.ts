import express, { Express } from "express";
import _ from "lodash";
import { Model } from "mongoose";
import path from "path";
import { generateFields, isJson, parseBody } from "./utils";

export function init(app: Express, models: Array<Model<any>>) {
  app.set("views", [path.join(__dirname, "views"), app.settings.views]);
  app.set("view engine", "pug");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  models.forEach(model => {
    const {
      modelName,
      // @ts-ignore
      schema: { paths },
      collection: { collectionName }
    } = model;

    const data = {
      collectionName,
      modelName,
      schema: model.schema,
      fields: generateFields(paths)
    };

    app.get(`/cms/${collectionName}/create`, (req, res, next) => {
      res.render("create", data);
    });

    app.post(`/cms/${collectionName}/create`, async (req, res, next) => {
      const formData = parseBody(req.body);

      try {
        const foo = await model.create(formData);
        res.send("success");
      } catch (err) {
        const fields = data.fields.map(field => {
          return {
            ...field,
            value: req.body[field.name]
          };
        });

        if (!err.errors) {
          res.render("create", {
            ...data,
            errors: [JSON.stringify(err)],
            fields
          });
        }

        const errors = Object.keys(err.errors).map(key => {
          const error = err.errors[key];
          const message = error.message;

          if (isJson(error.value)) {
            return message.replace("(`" + error.value + "`)", "");
          }

          return message;
        });

        res.render("create", {
          ...data,
          errors,
          fields
        });
      }
    });
  });
}
