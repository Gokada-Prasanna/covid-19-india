const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log("DB Error: ${e.message}");
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObjectState = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDbObjectToResponseObjectDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT *
    FROM state;`;

  const statesArray = await db.all(getStatesQuery);
  const convertedStatesArray = [];
  for (let i of statesArray) {
    convertedStatesArray.push(convertDbObjectToResponseObjectState(i));
  }
  response.send(convertedStatesArray);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
SELECT *
FROM state
WHERE state_id=${stateId};`;

  let stateDetails = await db.get(getStateQuery);
  stateDetails = convertDbObjectToResponseObjectState(stateDetails);
  response.send(stateDetails);
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const addDistrictDetailsQuery = `
INSERT INTO
district (district_name, state_id, cases, cured, active, deaths)
VALUES (
    '${districtName}',
    '${stateId}',
    '${cases}',
    '${cured}',
    '${active}',
    '${deaths}'
);`;

  await db.run(addDistrictDetailsQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsDetailsQuery = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};`;

  let districtDetails = await db.get(getDistrictsDetailsQuery);
  let convertedDistrictDetails = convertDbObjectToResponseObjectDistrict(
    districtDetails
  );
  response.send(convertedDistrictDetails);
});

app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM 
  district
  WHERE district_id = ${districtId};
  `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictQuery = `
  UPDATE district
  SET 
  district_name = '${districtName}',
  state_id = '${stateId}',
  cases = '${cases}',
  cured = '${cured}',
  active = '${active}',
  deaths = '${deaths}'
  WHERE district_id = ${districtId};`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatusQuery = `
SELECT SUM(cases) as totalCases,
SUM(cured) as totalCured,
SUM(active) as totalActive,
SUM(deaths) as totalDeaths
FROM district
WHERE state_id = ${stateId}
ORDER BY state_id;`;

  const statusDetails = await db.get(getStatusQuery);
  response.send(statusDetails);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
SELECT state.state_name as stateName
FROM district INNER JOIN state ON district.state_id = state.state_id
WHERE district_id = ${districtId};`;

  let dbResponse = await db.get(getStateNameQuery);

  response.send(dbResponse);
});

module.exports = app;
