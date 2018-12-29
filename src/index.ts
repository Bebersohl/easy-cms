import express, { Express } from 'express'
import _ from 'lodash'
import { Model } from 'mongoose'
import path from 'path'
import { createRegex, generateFields, handleError, parseBody } from './utils'

export function init(app: Express, models: Array<Model<any>>) {
  app.set('views', [path.join(__dirname, 'views'), app.settings.views])
  app.set('view engine', 'pug')
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  models.forEach(model => {
    const {
      modelName,
      // @ts-ignore
      schema: { paths },
      collection: { collectionName },
    } = model

    const options = {
      collectionName,
      modelName,
      schema: model.schema,
      fields: generateFields(paths),
    }

    app.get(`/cms/${collectionName}`, async (req, res, next) => {
      try {
        let dbQuery = {}

        if (req.query.search) {
          const searchFields = options.fields
            .filter(field => field.type === 'text' || field.type === 'date')
            .map(field => ({
              [field.name]: createRegex(req.query.search),
            }))

          dbQuery = {
            $or: searchFields,
          }
        }

        let docs = await model.find(dbQuery)

        if (req.query.orderBy) {
          docs = _.sortBy(docs, [req.query.orderBy])
        }

        if (req.query.order === 'desc') {
          docs = docs.reverse()
        }

        res.render('list', {
          ...options,
          collectionIsEmpty: !req.query.search && !docs.length,
          query: req.query,
          docs,
        })
      } catch (err) {
        // console.error(err)
      }
    })

    app.get(`/cms/${collectionName}/create`, (req, res, next) => {
      res.render('create', options)
    })

    app.post(`/cms/${collectionName}/create`, async (req, res, next) => {
      const formData = parseBody(req.body)

      try {
        const foo = await model.create(formData)
        res.send('success')
      } catch (error) {
        handleError(error, options, req, res)
      }
    })

    app.get(`/cms/${collectionName}/:id`, async (req, res, next) => {
      try {
        const item = model.findById(req.params.id)
        res.send(item)
        res.render('update', options)
      } catch (error) {
        // console.log(error);
      }
    })

    app.post(`/cms/${collectionName}/:id`, async (req, res, next) => {
      const formData = parseBody(req.body)
      res.send(formData)
      // try {
      //   const foo = await model.create(formData);
      //   res.send("success");
      // } catch (error) {
      //   handleError(error, options, req, res);
      // }
    })
  })
}
