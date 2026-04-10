import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import GraphView from "@/components/GraphView";

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Risk Intelligence
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Fraud detection and money laundering analysis using graph visualization
        </Typography>
        <GraphView />
      </Box>
    </Container>
  );
}
