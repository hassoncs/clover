const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '../pencil-comparison/pencil-dev')));

app.get('/', (req, res) => {
  const nodeId = req.query.nodeId; 
  if (nodeId && nodeId.endsWith(".png")) {
    res.send(`
      <!doctype html>
      <html>
        <body style="margin:0;display:flex;justify-content:center;background:#1e1e1e;align-items:center;min-height:100vh;">
          <img src="/${nodeId}" style="width:390px;height:844px;box-shadow:0 10px 25px rgba(0,0,0,0.5);" />
        </body>
      </html>
    `);
  } else {
    res.send(`Node not found: ${nodeId}`);
  }
});

app.listen(3001, () => {
  console.log('Fake Pencil Runtime running on http://localhost:3001');
});
