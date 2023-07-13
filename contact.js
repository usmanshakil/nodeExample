import Model from "../Models/Model";
import backblazeUpload from "../Utils/backblazeUpload";
import mongoose from "mongoose";

const create = async (req, res, next) => {
  const { first_name, last_name, phone, number_id } = req.body;
  if (!phone) return res.status(400).send("Missing fields");
  try {
    const user = {
      first_name: first_name,
      last_name: last_name,
      phone: phone,
      user_id: req.user._id,
      number_id: number_id,
    };

    if (req.file) {
      user.image = await backblazeUpload.uploadToB2(req.file);
    }
    const created_contact = await Model.ContactModel.create(user);

    return res.status(200).send({
      success: true,
      id: created_contact._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

const get = async (req, res, next) => {
  try {
    const user_contacts = await Model.ContactModel.aggregate([
      {
        $match: {
          $or: [
            { user_id: mongoose.Types.ObjectId(req.user._id) },
            { user_id: mongoose.Types.ObjectId(req.user.parent_user_id) },
          ],
        },
      },
      {
        $lookup: {
          from: "chats",
          let: {
            contact_phone: "$phone",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$source", "$$contact_phone"] },
                    { $eq: ["$destination", "$$contact_phone"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                source: 1,
                destination: 1,
                message: 1,
                incoming: 1,
                createdAt: 1,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "messages",
        },
      },
      { $sort: { track_messages: -1 } },
    ]);

    return res.status(200).send({
      success: true,
      data: user_contacts,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

const update = async (req, res, next) => {
  const { first_name, last_name, phone } = req.body;
  const contact = { first_name, last_name, phone };

  try {
    Object.keys(contact).forEach((key) =>
      contact[key] === undefined ? delete contact[key] : {}
    );

    if (req.file) {
      contact.image = await backblazeUpload.uploadToB2(req.file);
    }
    const query = { $set: contact };
    const updated_contact = await Model.ContactModel.findByIdAndUpdate(
      req.params.contact_id,
      query
    );
    return res.status(200).send({
      success: true,
      id: updated_contact._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};
const searchContact = async (req, res, next) => {
  const query = req.query.q;
  if (!query) return res.status(400).send("Query param missing");
  try {
    const contacts = await Model.ContactModel.find({
      user_id: req.user._id,
      $or: [
        { first_name: { $regex: query, $options: "i" } },
        { last_name: { $regex: query, $options: "i" } },
      ],
    }).lean();
    res.status(200).send({
      success: true,
      data: contacts,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

const updateArchived = async (req, res, next) => {
  try {
    const { archived } = req.body;
    await Model.ContactModel.updateOne(
      { _id: req.params.contact_id },
      { $set: { archived: archived } }
    );

    return res.status(200).send({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

const deleteContact = async (req, res, next) => {
  const { contact_id } = req.params;
  try {
    const deleted_contact = await Model.ContactModel.findByIdAndDelete(
      contact_id
    );
    if (!deleted_contact) return res.status(404).send("Contact not found");

    return res.status(200).send({
      success: true,
      id: deleted_contact._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

const getContactRecentChat = async (req, res, next) => {
  const contact_id = req.params.contact_id;
  console.log(contact_id);
  try {
    const recent_chat = await Model.ContactModel.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(contact_id) },
      },
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "contact_id",
          pipeline: [
            {
              $project: {
                message: 1,
                createdAt: 1,
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "recent_message",
        },
      },
    ]);
    return res.status(200).send({
      success: true,
      data: recent_chat,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};
export default {
  create,
  get,
  update,
  searchContact,
  updateArchived,
  deleteContact,
  getContactRecentChat,
};
