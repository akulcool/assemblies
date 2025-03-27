import React, { useState } from "react";
import { Container, TextField, Button, Typography, Box, CircularProgress, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

function SheetMetalApp() {
  const [context, setContext] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modificationInput, setModificationInput] = useState("");

  // Generate JSON
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          sessionId: "195234", 
          context 
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResponse(data.result);
      } else {
        alert("Error generating JSON: " + data.error);
      }
    } catch (error) {
      console.error("Error generating JSON:", error);
    }
    setLoading(false);
  };

  // Open modification dialog
  const handleOpenModifyDialog = () => {
    setModificationInput(""); // Pre-fill with current JSON
    setModifyDialogOpen(true);
  };

  // Modify JSON
  const handleModify = async () => {
    setModifying(true); // Show modifying loader
    try {
      const res = await fetch("http://localhost:5001/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          sessionId: "195234", 
          modificationInput 
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResponse(data.updatedJson); // Update displayed JSON
        setModifyDialogOpen(false); // Close dialog
      } else {
        alert("Error modifying JSON: " + data.error);
      }
    } catch (error) {
      console.error("Error modifying JSON:", error);
    }
    setModifying(false); // Hide modifying loader
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#ffe6e6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {(loading || modifying) && (
        <Box sx={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(255, 255, 255, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <CircularProgress size={60} />
        </Box>
      )}
      <Container maxWidth="md">
        <Box my={4}>
          <Typography variant="h4" gutterBottom align="center">
            Sheet Metal Bracket Generator
          </Typography>
          <Paper elevation={3} sx={{ padding: 3, borderRadius: 2, backgroundColor: "#fff" }}>
            <TextField
              label="Enter Context"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" color="primary" onClick={handleGenerate} disabled={loading} fullWidth>
              {loading ? "Generating..." : "Generate"}
            </Button>

            {response && (
              <Box mt={4}>
                <Typography variant="h6">Generated JSON:</Typography>
                <Paper sx={{ background: "#f4f4f4", padding: 2, borderRadius: 1 }}>
                  <pre style={{ overflowX: "auto" }}>{response}</pre>
                </Paper>

                {/* Ask if the user wants to modify */}
                <Button variant="contained" color="secondary" onClick={handleOpenModifyDialog} sx={{ mt: 2 }} fullWidth>
                  Modify
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>

      {/* Modify Dialog */}
      <Dialog open={modifyDialogOpen} onClose={() => setModifyDialogOpen(false)} fullWidth>
        <DialogTitle>Modify JSON</DialogTitle>
        <DialogContent>
          <TextField
            label="Modify JSON"
            variant="outlined"
            fullWidth
            multiline
            rows={6}
            value={modificationInput}
            onChange={(e) => setModificationInput(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModifyDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleModify} color="primary" variant="contained" disabled={modifying}>
            {modifying ? "Modifying..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SheetMetalApp;
