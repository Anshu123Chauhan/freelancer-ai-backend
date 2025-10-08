import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.js';
import routes from './dashboard/routes.js';
import morgan from 'morgan';
import winston from "winston";
import "winston-daily-rotate-file";
import swaggerUi from "swagger-ui-express";
import cors from 'cors';
import swaggerDocument from "./swagger-output.json" with { type: "json" };

dotenv.config();
const app = express();
app.use(express.json());
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3017"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
await connectDB();
const transport = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%-combined.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "5m",
  maxFiles: "14d",
});
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    transport
  ],
});
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);
app.use("/uploads", express.static("uploads"));
app.use('/api', routes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/', (req, res) => res.send('ECOM-Multivendor server is running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));

