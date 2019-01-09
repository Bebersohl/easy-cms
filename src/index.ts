import express, { Express } from 'express'
import _ from 'lodash'
import { Model } from 'mongoose'
import path from 'path'
import url from 'url'
import {
  createRegex,
  generateFields,
  handleError,
  parseBody,
  printDocumentField,
} from './utils'

export function init(app: Express, models: Array<Array<Model<any>>>) {
  app.set('views', [path.join(__dirname, 'views'), app.settings.views])
  app.set('view engine', 'pug')
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use((req, res, next) => {
    res.locals.printDocumentField = printDocumentField
    next()
  })

  const navigation = models.map(modelArr =>
    modelArr.map(model => model.modelName)
  )

  const allModels = _.flatten(models)

  app.get('/cms', async (req, res, next) => {
    const documentCountPromises: any[] = allModels.map(model =>
      model.estimatedDocumentCount()
    )

    const documentCountArray = await Promise.all(documentCountPromises)

    const documentCountMap = documentCountArray.reduce((map, count, index) => {
      const modelName = allModels[index].modelName
      return {
        ...map,
        [modelName]: count,
      }
    }, {})

    res.render('dashboard', {
      navigation,
      documentCountMap,
    })
  })

  allModels.forEach(model => {
    const {
      modelName,
      // @ts-ignore
      schema: { paths },
      collection: { collectionName },
    } = model

    const secondaryNavigation = (
      navigation.find(arr => arr.includes(modelName)) || []
    ).slice(1)

    const options = {
      collectionName,
      modelName,
      fields: generateFields(paths),
      navigation,
      secondaryNavigation,
    }

    app.get(`/cms/${modelName}`, async (req, res, next) => {
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

    app.post(`/cms/${modelName}`, async (req, res, next) => {
      try {
        const search = url.parse(req.url).search || ''
        if (typeof req.body._id === 'string') {
          await model.deleteOne({ _id: req.body._id })
          res.redirect(`/cms/${modelName}${search}`)
        }

        await model.deleteMany({ _id: { $in: req.body._id } })
        res.redirect(`/cms/${modelName}${search}`)
      } catch (err) {
        // console.log(err)
      }
    })

    app.get(`/cms/${modelName}/create`, (req, res, next) => {
      res.render('create', options)
    })

    app.post(`/cms/${modelName}/create`, async (req, res, next) => {
      const formData = parseBody(req.body)

      try {
        const doc = await model.create(formData)
        res.redirect(`/cms/${modelName}/${doc._id}`)
      } catch (error) {
        handleError(error, options, req, res)
      }
    })

    app.get(`/cms/${modelName}/:id`, async (req, res, next) => {
      try {
        const doc = await model.findById(req.params.id)

        res.render('update', {
          ...options,
          fields: options.fields.map(field => ({
            ...field,
            value: doc[field.name],
          })),
        })
      } catch (error) {
        console.log(error)
      }
    })

    app.post(`/cms/${modelName}/:id`, async (req, res, next) => {
      const formData = parseBody(req.body)
      res.send(formData)
      // try {
      //   const foo = await model.create(formData);
      //   res.send("success");
      // } catch (error) {
      //   handleError(error, options, req, res);
      // }
    })

    app.get(`/cms/api/${modelName}/all`, async (req, res, next) => {
      try {
        const docs = await model.find({})
        res.json(docs)
      } catch (err) {
        console.log(err)
      }
    })
  })
}
