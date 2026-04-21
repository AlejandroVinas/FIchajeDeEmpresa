const express = require('express');
const cors    = require('cors');
const { PORT } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth',      require('./routes/auth'));
app.use('/fichajes',  require('./routes/fichajes'));
app.use('/empleados', require('./routes/empleados'));
app.use('/push',      require('./routes/push'));

app.listen(PORT, () => console.log(`Backend escuchando en http://localhost:${PORT}`));
