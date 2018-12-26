import express from "express";

export const adminRouter = express.Router();

adminRouter.get("/", (req, res, next) => {
  res.send("respond with a resource!!");
});
