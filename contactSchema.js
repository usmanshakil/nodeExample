const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: false,
    },
    last_name: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    number_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "number",
    },
    archived: {
      type: Boolean,
      required: false,
      default: false,
    },
    track_messages: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("contact", contactSchema);
