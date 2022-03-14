const router = module.exports = require('express').Router();

router.use('/users', require('./routes/user'));
router.use('/pets', require('./routes/pet'));
router.use('/requests', require('./routes/requests'));
router.use('/', require('./routes/app'));
