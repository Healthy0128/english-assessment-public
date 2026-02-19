const express = require('express');
const router = express.Router();
const multer = require('multer');
const evaluationController = require('../controllers/evaluationController');

const upload = multer({ dest: 'uploads/' });

router.post('/api/evaluate', upload.single('audio'), evaluationController.evaluate);

module.exports = router;
