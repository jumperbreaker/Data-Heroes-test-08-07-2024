const http = require('http');
const url = require('url');
const fs = require("fs");
const pg = require("pg");

const config = {
    connectionString:
        "postgres://candidate:62I8anq3cFq5GYh2u4Lh@rc1b-r21uoagjy1t7k77h.mdb.yandexcloud.net:6432/db1",
    ssl: {
        rejectUnauthorized: true,
        ca: fs
            .readFileSync("root.crt")
            .toString(),
    },
};

const conn = new pg.Client(config);

conn.connect((err) => {
    if (err) throw err;
});

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/characters') {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch('https://rickandmortyapi.com/api/character');
      const data = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
      res.statusCode = 500;
      res.end('Error fetching characters');
    }
  } else if (parsedUrl.pathname === '/database') {
    try {
      conn.query("SELECT version()", (err, q) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(q.rows[0], null, 2));
      });
    } catch (error) {
      console.error('Error:', error);
      res.statusCode = 500;
      res.end('Error fetching database information');
    }
  } else if (parsedUrl.pathname === '/tables') {
    try {
      conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", (err, q) => {
        if (err) throw err;
        const tableNames = q.rows.map(row => row.table_name).join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.end(tableNames);
      });
    } catch (error) {
      console.error('Error:', error);
      res.statusCode = 500;
      res.end('Error fetching table list');
    }
  } else if (parsedUrl.pathname === '/create-table') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const characterData = JSON.parse(body);
          await conn.query(`
            CREATE TABLE IF NOT EXISTS jumperbreaker (
              id SERIAL PRIMARY KEY,
              name TEXT,
              data JSONB
            )
          `);

          for (const character of characterData.results) {
            await conn.query(`
              INSERT INTO jumperbreaker (name, data)
              VALUES ($1, $2)
            `, [character.name, JSON.stringify(character)]);
          }

          res.setHeader('Content-Type', 'text/plain');
          res.end('Table created and data saved successfully!');
        } catch (error) {
          console.error('Error:', error);
          res.statusCode = 500;
          res.end('Error creating and saving table');
        }
      });
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  } else if (parsedUrl.pathname === '/jumperbreaker') {
    if (req.method === 'DELETE') {
      try {
        await conn.query(`DROP TABLE IF EXISTS jumperbreaker`);
        res.setHeader('Content-Type', 'text/plain');
        res.end('Table jumperbreaker deleted successfully!');
      } catch (error) {
        console.error('Error:', error);
        res.statusCode = 500;
        res.end('Error deleting jumperbreaker table');
      }
    } else {
      try {
        conn.query("SELECT * FROM jumperbreaker", (err, q) => {
          if (err) throw err;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(q.rows, null, 2));
        });
      } catch (error) {
        console.error('Error:', error);
        res.statusCode = 500;
        res.end('Error fetching jumperbreaker table data');
      }
    }
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <html>
        <head>
          <title>Rick and Morty Characters</title>
          <style>
            .button-container {
              margin-top: 10px;
              margin-bottom: 10px;
            }

            .my-table {
              border-collapse: collapse;
              width: 100%;
            }

            .my-table th,
            .my-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }

            .my-table th {
              background-color: #f2f2f2;
            }

          </style>
        </head>
        <body>
          <div class="container">
            <h1>Rick and Morty Characters</h1>
            <div class="button-container">
              <button onclick="fetchCharacters()">JSON Load Characters from rickandmortyapi.com</button>
            </div>
            <textarea class="character-box" id="characters" readonly style="width: 100%;" rows="10"></textarea>
            <div class="button-container">
              <button onclick="fetchDatabaseInfo()">View Database info</button>
            </div>
            <textarea class="character-box" id="database-info" readonly style="width: 100%;" rows="5"></textarea>
            <div class="button-container">
              <button onclick="fetchAllTables()">Load All Tables from DB yandexcloud</button>
            </div>
            <textarea class="character-box" id="table-list" readonly style="width: 100%;" rows="10"></textarea>
            <div class="button-container">
              <button onclick="createAndSaveTable()">Create and Save Table jumperbreaker</button>
            </div>
            <div class="button-container">
              <button onclick="deleteJumperBreakerTable()">Delete table jumperbreaker</button>
            </div>
            <div class="button-container">
              <button onclick="browseJumperBreakerTable()">Browse table jumperbreaker</button>
            </div>            
            <div id="jumperbreaker-table"></div>
          </div>
          <script>
            function fetchCharacters() {
              fetch('/characters')
                .then(response => response.text())
                .then(data => {
                  const charactersDiv = document.getElementById('characters');
                  charactersDiv.value = data;
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Error fetching characters');
                });
            }

            function fetchDatabaseInfo() {
              fetch('/database')
                .then(response => response.text())
                .then(data => {
                  const databaseInfoDiv = document.getElementById('database-info');
                  databaseInfoDiv.value = data;
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Error fetching database information');
                });
            }

            function fetchAllTables() {
              fetch('/tables')
                .then(response => response.text())
                .then(data => {
                  const tableListDiv = document.getElementById('table-list');
                  tableListDiv.value = data;
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Error fetching table list');
                });
            }

            function createAndSaveTable() {
              fetch('/characters')
                .then(response => response.json())
                .then(data => {
                  fetch('/create-table', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                  })
                  .then(response => response.text())
                  .then(data => {
                    alert(data);
                    fetchAllTables();
                  })
                  .catch(error => {
                    console.error('Error:', error);
                    alert('Error creating and saving table');
                  });
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Error fetching characters');
                });
            }

            function browseJumperBreakerTable() {
              fetch('/jumperbreaker')
                .then(response => response.json())
                .then(data => {
                  const tableDiv = document.getElementById('jumperbreaker-table');
                  tableDiv.innerHTML = '';

                  const table = document.createElement('table');
                  table.classList.add('my-table'); // Добавляем класс для стилизации таблицы
                  const thead = document.createElement('thead');
                  const tbody = document.createElement('tbody');
                  
                  const headerRow = document.createElement('tr');
                  Object.keys(data[0]).forEach(key => {
                    const th = document.createElement('th');
                    th.textContent = key;
                    headerRow.appendChild(th);
                  });
                  thead.appendChild(headerRow);
                  
                  data.forEach(row => {
                    const tr = document.createElement('tr');
                    Object.values(row).forEach(value => {
                      const td = document.createElement('td');
                      if (typeof value === 'object' && value !== null) {
                        td.textContent = JSON.stringify(value, null, 2);
                      } else {
                        td.textContent = value;
                      }
                      tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                  });

                  table.appendChild(thead);
                  table.appendChild(tbody);
                  tableDiv.appendChild(table);
                })
                .catch(error => {
                  console.error('Error:', error);
                  alert('Error fetching jumperbreaker table data');
                });
            }


            function deleteJumperBreakerTable() {
              fetch('/jumperbreaker', {
                method: 'DELETE'
              })
              .then(response => response.text())
              .then(data => {
                alert(data);
                fetchAllTables();
              })
              .catch(error => {
                console.error('Error:', error);
                alert('Error deleting jumperbreaker table');
              });
            }
          </script>
        </body>
      </html>
    `);
  }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});