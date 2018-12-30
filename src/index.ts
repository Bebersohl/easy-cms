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
      fields: generateFields(paths),
    }

    app.get(`/cms/${collectionName}`, async (req, res, next) => {
      try {
        let dbQuery = {}
        const orderBy = _.get(req, 'query.orderBy') || options.fields[0].name
        const order = _.get(req, 'query.order', '1')
        const index = parseInt(_.get(req, 'query.index', 0), 10)
        const search = _.get(req, 'query.search', '')

        if (search) {
          const searchFields = options.fields
            .filter(field => field.type === 'text')
            .map(field => ({
              [field.name]: createRegex(search),
            }))

          dbQuery = {
            $or: searchFields,
          }
        }

        const collectionCount = search
          ? await model.countDocuments(dbQuery)
          : await model.estimatedDocumentCount()

        const docs = await model
          .find(dbQuery)
          .sort({ [orderBy]: order })
          .skip(index)
          .limit(100)

        let pagesStart = index - 500
        let pagesStartOverflow = 0
        let pagesEnd = index + 500
        let pagesEndOverflow = 0
        const pagesCap = Math.ceil(collectionCount / 100) * 100

        if (pagesStart < 0) {
          pagesStartOverflow = Math.abs(pagesStart)
        }

        if (pagesEnd > pagesCap) {
          pagesEndOverflow = pagesEnd - pagesCap
        }

        pagesStart = Math.max(pagesStart - pagesEndOverflow, 0)
        pagesEnd = Math.min(pagesCap, pagesEnd + pagesStartOverflow)

        const pages = _.range(pagesStart, pagesEnd, 100).map(i => ({
          text: (i / 100 + 1).toString(),
          offset: i,
        }))

        if (pagesStart !== 0) {
          pages.unshift({
            text: '...',
            offset: 0,
          })
        }

        if (pagesEnd !== pagesCap) {
          pages.push({
            text: '...',
            offset: pagesCap - 100,
          })
        }

        res.render('list', {
          ...options,
          collectionCount,
          collectionIsEmpty: !search && !docs.length,
          query: {
            orderBy,
            order,
            search,
            index,
          },
          pages,
          fromIndex: index + 1,
          toIndex: Math.min(collectionCount, index + 100),
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
