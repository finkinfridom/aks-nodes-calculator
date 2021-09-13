import "./App.css";
import { useEffect, useState, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableFooter from "@material-ui/core/TableFooter";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Icon from "@material-ui/core/Icon";

const useStyles = makeStyles((theme) => ({
  families: {
    marginTop: "10px",
  },
  table_footer: {
    fontSize: "1rem",
    color: "#000",
    fontWeight: "bold",
  },
  actions: {
    marginRight: "10px",
  },
  lastOf: {
    marginRight: 0,
  },
}));
function App() {
  const classes = useStyles();
  const [rows, setRows] = useState([]);
  const [csvUrl, setCsvUrl] = useState(null);
  const [totalResources, setTotalResources] = useState(0);
  const [totals, setTotals] = useState(null);

  const processCSV = (str, delim = ",") => {
    const headers = str.slice(0, str.indexOf("\n")).split(delim);
    const rows = str.slice(str.indexOf("\n") + 1).split("\n");

    const newArray = rows.map((row) => {
      const rowId = new Date().getTime();
      const values = row.split(delim);
      const eachObject = headers.reduce((obj, header, i) => {
        if (header === "AppName") {
          header = "appName";
        }
        obj[header] = values[i];
        return obj;
      }, {});
      eachObject.id = `${eachObject.appName}-${rowId}`;
      return eachObject;
    });

    setRows(newArray);
  };
  const readCsvFile = (csvFile) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;
      processCSV(text);
    };

    reader.readAsText(csvFile);
  };
  const DAEMONSETS_CPU = 200;
  const ZERO_TO_FIXED = (0.0).toFixed(2);
  const MAX_PODS_PER_NODE = 250;
  const resources = [
    {
      family: "b2ms_d2as",
      cpu: 1900,
      memory: 7961,
    },
    {
      family: "b4ms_d4as",
      cpu: 3860,
      memory: 12601,
    },
    { family: "b8ms_d8as", cpu: 7820, memory: 27721 },
    { family: "b16ms_d16as", cpu: 15640, memory: 55442 },
  ];
  const getAvailableResources = (family) => {
    const resource = resources.find((f) => f.family === family);
    return resource.cpu + resource.memory - DAEMONSETS_CPU;
  };
  const onKeyPress = (e) => {
    if (e.keyCode !== 13 && e.charCode !== 13) {
      return;
    }
    addRow();
  };
  const addRow = () => {
    const newRow = {
      id: new Date().getTime(),
      cpuRequest: 0,
      appName: "",
      memoryRequest: 0,
      numOfTenants: 1,
      numOfDesiredPods: 1,
    };
    setRows((prevRows) => {
      return [].concat(prevRows).concat(newRow);
    });
  };
  const updateField = (row, field, value) => {
    row[field] = value;
    setRows((prevRows) => {
      const index = prevRows.indexOf(row);
      if (index !== -1) {
        prevRows.splice(index, 1);
      }
      const result = [].concat(prevRows);
      result.splice(index !== -1 ? index : result.length - 1, 0, row);
      return result;
    });
  };
  const getTotalNumOfInstances = useCallback((row) => {
    return row ? +row.numOfTenants * +row.numOfDesiredPods : -1;
  }, []);
  const getCpuPerInstances = useCallback(
    (row) => {
      return row ? +row.cpuRequest * getTotalNumOfInstances(row) : -1;
    },
    [getTotalNumOfInstances]
  );
  const getMemoryPerInstances = useCallback(
    (row) => {
      return row ? +row.memoryRequest * getTotalNumOfInstances(row) : -1;
    },
    [getTotalNumOfInstances]
  );
  const removeRow = (row) => {
    setRows((prevRows) => {
      const index = prevRows.indexOf(row);
      if (index !== -1) {
        prevRows.splice(index, 1);
      }
      return [].concat(prevRows);
    });
  };
  const getTotalResources = useCallback(() => {
    let totalCpus = 0;
    let totalMemories = 0;
    for (const row of rows) {
      totalCpus += getCpuPerInstances(row);
      totalMemories += getMemoryPerInstances(row);
    }
    return totalCpus + totalMemories;
  }, [rows, getCpuPerInstances, getMemoryPerInstances]);
  const getTotalNodesNeeded = (family) => {
    const availableResources = getAvailableResources(family);
    return (totalResources / availableResources).toFixed(2);
  };
  const calculateTotals = () => {
    const result = {};
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      result[r.family] = {
        nodesNeeded: getTotalNodesNeeded(r.family),
        nodesNeeded_reviewed: countNodes(getAvailableResources(r.family)),
      };
    }
    setTotals(result);
  };

  const fillSvcsList = () => {
    const result = [];
    for (let svc of rows) {
      const iterations = +svc.numOfDesiredPods * +svc.numOfTenants;
      for (let i = 0; i < iterations; i++) {
        result.push({
          appName: svc.appName,
          resources: +svc.cpuRequest + +svc.memoryRequest,
        });
      }
    }
    return result;
  };
  const countNodes = (availableSpace) => {
    const svcs = fillSvcsList();
    return fillSpace(svcs, availableSpace, availableSpace, 1);
  };
  const fillSpace = (svcs, maxAvailableSpace, availableSpace, nodesNeeded) => {
    let remaining_space = availableSpace;
    const filled_svcs = [];
    const remaining_svcs = [];
    for (let svc of svcs) {
      // console.log(svc);
      if (filled_svcs.length >= MAX_PODS_PER_NODE) {
        remaining_svcs.push(svc);
        continue;
      }
      const resources = svc.resources;
      const have_space = remaining_space - resources;
      if (have_space > 0) {
        remaining_space -= resources;
        filled_svcs.push(svc);
        continue;
      }

      remaining_svcs.push(svc);
    }

    // console.log("===================");
    // console.log("Total services: {0}", svcs.length);
    // console.log(
    //   "remaining_space: {0} ({1}%)",
    //   remaining_space,
    //   ((remaining_space * 1.0) / (maxAvailableSpace * 1.0)) * 100.0
    // );
    // console.log("filled_svcs {0}", filled_svcs.length);
    // console.log("remaining_svcs {0}", remaining_svcs.length);
    if (!remaining_svcs.length) {
      // console.log("No more services remaining");
      return nodesNeeded;
    }

    const resourcesMap = remaining_svcs.map(
      (s) => getCpuPerInstances(s) + getMemoryPerInstances(s)
    );
    const lowestSvcResources = Math.min.apply(Math, resourcesMap);
    //console.log("lowestSvcResources {0}", lowestSvcResources);

    if (lowestSvcResources <= remaining_space) {
      // console.log("space available");
      return fillSpace(
        remaining_svcs,
        maxAvailableSpace,
        remaining_space,
        nodesNeeded
      );
    }
    if (lowestSvcResources > maxAvailableSpace) {
      return nodesNeeded;
    }
    // console.log("new node spawn", maxAvailableSpace);
    nodesNeeded++;
    // if (nodesNeeded < 3) {
    return fillSpace(
      remaining_svcs,
      maxAvailableSpace,
      maxAvailableSpace,
      nodesNeeded
    );
    // }
  };
  useEffect(() => {
    setTotalResources(getTotalResources(rows));
    const csvContent = `appName,cpuRequest,cpuPerInstances,memoryRequest,memoryPerInstances,numOfTenants,numOfDesiredPods\n${rows
      .map((r) => {
        return `${r.appName},${r.cpuRequest},${getCpuPerInstances(r)},${
          r.memoryRequest
        },${getMemoryPerInstances(r)},${r.numOfTenants},${r.numOfDesiredPods}`;
      })
      .join("\n")}`;
    setCsvUrl(csvContent);
  }, [
    getTotalResources,
    rows,
    setTotalResources,
    getCpuPerInstances,
    getMemoryPerInstances,
  ]);
  return (
    <Container maxWidth="lg">
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>App Name</TableCell>
              <TableCell align="right">CPU request</TableCell>
              <TableCell align="right">CPU * instances</TableCell>
              <TableCell align="right">Memory request</TableCell>
              <TableCell align="right">Memory * instances</TableCell>
              <TableCell align="right"># of tenants</TableCell>
              <TableCell align="right"># of desired pods</TableCell>
              <TableCell align="right">Total # of instances</TableCell>
              <TableCell align="right">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    addRow();
                  }}
                >
                  <Icon>add</Icon>
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell component="th" scope="row">
                  <TextField
                    variant="outlined"
                    type="text"
                    defaultValue={row.appName}
                    onKeyPress={onKeyPress}
                    onChange={(e) => {
                      updateField(row, "appName", e.target.value);
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    variant="outlined"
                    type="number"
                    defaultValue={row.cpuRequest}
                    onKeyPress={onKeyPress}
                    onChange={(e) => {
                      updateField(row, "cpuRequest", e.target.value);
                    }}
                  />
                </TableCell>
                <TableCell align="right">{getCpuPerInstances(row)}</TableCell>
                <TableCell align="right">
                  <TextField
                    variant="outlined"
                    type="number"
                    defaultValue={row.memoryRequest}
                    onKeyPress={onKeyPress}
                    onChange={(e) => {
                      updateField(row, "memoryRequest", e.target.value);
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  {getMemoryPerInstances(row)}
                </TableCell>
                <TableCell align="right">
                  <TextField
                    variant="outlined"
                    type="number"
                    defaultValue={row.numOfTenants}
                    onKeyPress={onKeyPress}
                    onChange={(e) => {
                      updateField(row, "numOfTenants", e.target.value);
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    variant="outlined"
                    type="number"
                    defaultValue={row.numOfDesiredPods}
                    onKeyPress={onKeyPress}
                    onChange={(e) => {
                      updateField(row, "numOfDesiredPods", e.target.value);
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  {getTotalNumOfInstances(row)}
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      removeRow(row);
                    }}
                  >
                    <Icon>remove</Icon>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8} className={classes.table_footer}>
                Total resources requested
              </TableCell>
              <TableCell align="right" className={classes.table_footer}>
                {getTotalResources()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={6}></TableCell>
              <TableCell align="right" colSpan={3}>
                {rows.length && csvUrl ? (
                  <Button
                    className={classes.actions}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      calculateTotals();
                    }}
                  >
                    <Icon>sync</Icon>
                  </Button>
                ) : null}
                {rows.length && csvUrl ? (
                  <Button
                    className={classes.actions}
                    variant="contained"
                    color="secondary"
                    href={`data:text/csv;charset=utf-8,${csvUrl}`}
                    download="nodepool.csv"
                    target="download"
                  >
                    <Icon>download</Icon>
                  </Button>
                ) : null}
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  id="contained-button-file"
                  onChange={(e) => {
                    readCsvFile(e.target.files[0]);
                  }}
                />
                <label htmlFor="contained-button-file">
                  <Button
                    className={`${classes.actions} ${classes.lastOf}`}
                    variant="contained"
                    color="secondary"
                    component="span"
                  >
                    <Icon>upload</Icon>
                  </Button>
                </label>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      <Grid container spacing={3} className={classes.families}>
        {resources.map((r) => (
          <Grid item xs={3} key={r.family}>
            <Card variant="outlined">
              <CardHeader title={r.family}></CardHeader>
              <CardContent>
                Available resources: {getAvailableResources(r.family)}
                <br />
                <br />
                Total nodes needed:{" "}
                {totals ? totals[r.family].nodesNeeded : ZERO_TO_FIXED}
                <br />
                <br />
                Total nodes needed (reviewed):{" "}
                {totals ? totals[r.family].nodesNeeded_reviewed : ZERO_TO_FIXED}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default App;
