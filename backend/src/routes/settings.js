const express = require('express');
const router = express.Router();
const SettingsModel = require('../models/Settings');

module.exports = function() {
  // GET /api/settings
  router.get('/', async (req, res) => {
    try {
      const settings = await SettingsModel.get();
      res.json({ success: true, data: settings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/settings
  router.put('/', async (req, res) => {
    try {
      const updated = await SettingsModel.update(req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
