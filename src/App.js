import "./App.css";
import { useEffect, useState } from "react";
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
import CardContent from "@material-ui/core/CardContent";

function App() {
  const [rows, setRows] = useState([]);
  const [totalResources, setTotalResources] = useState(0);
  const daemonsetcpu = 200;
  const resources = [
    { family: "b2ms_d2as", cpu: 1900, memory: 7961 },
    {
      family: "b4ms_d4as",
      cpu: 3860,
      memory: 12601,
    },
    { family: "b8ms_d8as", cpu: 7820, memory: 27721 },
  ];
  const getAvailableResources = (family) => {
    const resource = resources.find((f) => f.family === family);
    return resource.cpu + resource.memory - daemonsetcpu;
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
      return [].concat(prevRows).concat(row);
    });
  };
  const getTotalNumOfInstances = (row) => {
    return row ? +row.numOfTenants * +row.numOfDesiredPods : -1;
  };
  const getCpuPerInstances = (row) => {
    return row ? +row.cpuRequest * getTotalNumOfInstances(row) : -1;
  };
  const getMemoryPerInstances = (row) => {
    return row ? +row.memoryRequest * getTotalNumOfInstances(row) : -1;
  };
  const removeRow = (row) => {
    setRows((prevRows) => {
      const index = prevRows.indexOf(row);
      if (index !== -1) {
        prevRows.splice(index, 1);
      }
      return [].concat(prevRows);
    });
  };
  const getTotalResources = () => {
    let totalCpus = 0;
    let totalMemories = 0;
    for (const row of rows) {
      totalCpus += getCpuPerInstances(row);
      totalMemories += getMemoryPerInstances(row);
    }
    return totalCpus + totalMemories;
  };
  const getTotalNodesNeeded = (family) => {
    const availableResources = getAvailableResources(family);
    return totalResources / availableResources;
  };
  useEffect(() => {
    setTotalResources(getTotalResources(rows));
  }, [getTotalResources, rows, setTotalResources]);

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
                  Add
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell component="th" scope="row">
                  <TextField
                    variant="outlined"
                    type="text"
                    defaultValue={row.appName}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    variant="outlined"
                    type="number"
                    defaultValue={row.cpuRequest}
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
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total resources requested</TableCell>
              <TableCell>{getTotalResources()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      {resources.map((r) => (
        <Card variant="outlined">
          <CardContent>
            <h2>{r.family}</h2>
            <ul>
              <li>Available resources: {getAvailableResources(r.family)}</li>
              <li>Total nodes needed: {getTotalNodesNeeded(r.family)}</li>
            </ul>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default App;
