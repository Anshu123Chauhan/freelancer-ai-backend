import moment from "moment";

/**
 * Get current datetime in IST (MySQL friendly format)
 */
export function getCurrentDateTimeIST() {
//   return moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss");
return  moment().tz("Asia/Kolkata").toDate(); 
}