import express from "express";
import contactHandler from "../Controllers/contact";
const contactRouter = express.Router();
import verifyToken from "../Middlewares/verifyToken";
import upload from "../Utils/upload";

const fileupload = upload.uploadfile();

contactRouter.post(
  "/",
  [verifyToken, fileupload.single("file")],
  contactHandler.create
);
contactRouter.get("/", verifyToken, contactHandler.get);
contactRouter.put(
  "/:contact_id",
  [verifyToken, fileupload.single("file")],
  contactHandler.update
);
contactRouter.get("/search", verifyToken, contactHandler.searchContact);
contactRouter.put(
  "/archive/:contact_id",
  verifyToken,
  contactHandler.updateArchived
);
contactRouter.delete("/:contact_id", verifyToken, contactHandler.deleteContact);
contactRouter.get("/chat/recent/:contact_id",verifyToken,contactHandler.getContactRecentChat);
export default contactRouter;
