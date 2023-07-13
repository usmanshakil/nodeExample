import dotenv from "dotenv";
import axios from "axios";
import pocketbase from "../Utils/pocketbase";
import { isURL } from "../Utils/isURL";
const eventEmitter = require("../Events/eventEmitter");

var unirest = require("unirest");
require("../Events/sms-sent");
require("../Events/sms-received");
dotenv.config();

// This is used to send SMS/MMS to third party
const sendSmsorMms = async (req, res, next) => {
  const {
    sender,
    destination,
    message,
    number_id,
    user_id,
    media_url,
    carrier_id,
  } = req.body;
  try {
    const type = req.query.type;
    // Variables
    let guid = "";
    let success = false;
    // Used if commio does not use default creds
    let username = "";
    let account_id = "";
    let auth_token = "";
    if (carrier_id) {
      // Pocketbase db call
      const client = await pocketbase.getCommioClient(carrier_id);
      username = client.username;
      account_id = client.account_id;
      auth_token = client.auth_token;
      console.log(username, account_id, auth_token, "Three creds");
    }
    const authString = Buffer.from(
      `${carrier_id ? username : process.env.COMMIO_USERNAME}:${
        carrier_id ? auth_token : process.env.COMMIO_TOKEN
      }`
    ).toString("base64");

    if (type == "SMS") {
      const config = {
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
        },
      };
      const data = JSON.stringify({
        from_did: sender,
        to_did: destination,
        message: message,
      });
      const send_commio_response = await axios.post(
        `base_url/${
          carrier_id ? account_id : process.env.COMMIO_ACCOUNT_ID
        }/product/origination/sms/send`,
        data,
        config
      );
      if (send_commio_response && send_commio_response.data.guid) {
        success = true;
        guid = send_commio_response.data.guid;
      }
    } else if (type == "MMS") {
      const send_commio_response = await unirest(
        "POST",
        `base_url/${
          carrier_id ? account_id : process.env.COMMIO_ACCOUNT_ID
        }/product/origination/mms/send`
      )
        .headers({
          Authorization: `Basic ${authString}`,
        })
        .field("from_did", sender)
        .field("to_did", destination)
        .field("media_url", media_url)
        .field("message", message);

      if (
        send_commio_response &&
        JSON.parse(send_commio_response.raw_body).guid
      ) {
        success = true;
        guid = JSON.parse(send_commio_response.raw_body).guid;
      }
    }

    // Emit an event
    //   eventEmitter.emit("sms-sent", number_id, user_id, 0.006);
    return res.status(success ? 200 : 500).send({
      success: success,
      guid: success ? guid : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
    next(new Error("Internal Server Error!"));
  }
};

// This is used to recieve SMS using an inbound webhook
const receiveSmsorMms = async (req, res, next) => {
  const { from, to, message, type } = req.body;
  // A check for type
  const allowedTypes = ["sms", "mms"];
  if (!allowedTypes.includes(type))
    return res.status(400).json({
      success: false,
      message: "Invalid message type",
    });
  try {
    let chat_id = "";
    // Some checks due to bad request to our endpoint (Duplication check)
    if (type === "mms") {
      if (isURL(message)) {
        const media_url_arr = [message];
        const formData = {
          source: from,
          destination: to,
          incoming: true,
          read: false,
          media: media_url_arr,
        };
        chat_id = await pocketbase.createChatMessage(formData);
      } else {
        const checkDuplicateMessage = await pocketbase.checkDuplicateMessage(
          from,
          to,
          message
        );

        if (checkDuplicateMessage) {
          return res.status(204).send({});
        }
        const lastMessage = await pocketbase.getLastMessage(from, to);

        chat_id = await pocketbase.updateChatMessage(message, lastMessage.id);
      }
    } else if (type === "sms") {
      const formData = {
        source: from,
        destination: to,
        message: message,
        incoming: true,
        read: false,
      };
      chat_id = await pocketbase.createChatMessage(formData);
    }
    // Pocketbase db call (Utility method)
    await pocketbase.createContactIfExistsAndUpdateTS(to, from);
    const response = {
      success: true,
      id: chat_id,
    };
    return res.status(200).json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

export default {
  sendSmsorMms,
  receiveSmsorMms,
};
