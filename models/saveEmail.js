const mongoose = require('mongoose');

const saveEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model('SaveEmail', saveEmailSchema); 
