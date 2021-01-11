import express from "express";
import clientRouter from "./clientRouter.js";
const rootRouter = new express.Router(); //place your server-side routes here

rootRouter.use("/", clientRouter);

export default rootRouter;
