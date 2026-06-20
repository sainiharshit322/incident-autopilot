package com.incident.alert_gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AlertGatewayApplication {

	public static void main(String[] args) {
		SpringApplication.run(AlertGatewayApplication.class, args);
	}

}
// Ran command: ` d:; cd 'd:\Harshit\Incident Autopilot'; & 'C:\Program Files\Java\jdk-25.0.3\bin\java.exe' '@C:\Users\saini\AppData\Local\Temp\cp_7k8bdnto7b7o6szeujifoohcg.argfile' 'com.incident.alert_gateway.AlertGatewayApplication' `
// Viewed AlertController.java:72-97

// Since your Python and Java servers are both running, you have two great ways to test this: using **Postman** (like before) or directly through your **React Frontend** since we built the UI for it!

// ### Option 1: Test via your React Frontend (Easiest & Most Visual)
// Since I added the UI for this in `App.jsx`, testing it from the frontend is the best way to see the full experience:
// 1. If your frontend isn't already running, open a new terminal, `cd` into the `frontend` folder, and run `npm run dev`.
// 2. Open your browser to the local Vite URL (usually `http://localhost:5173`).
// 3. Click on any incident in the dashboard to open the details.
// 4. Scroll down to the new **Close Incident** section.
// 5. **To test AI Closing:** Select the "Generate with AI" radio button and click the close button. After a couple of seconds, you should hear a *ding* from Slack and see the newly generated note!
// 6. **To test Manual Closing:** Select the "Write Manually" option, type in a quick test message (like *"Fixed by restarting the database"*), and click Close. The Slack notification will appear instantly.

// ---

// ### Option 2: Test via Postman (Fastest for just API validation)
// If you want to bypass the frontend and just test the endpoints, you just need the ID of an active incident.

// **1. Test the Manual Close Notification**
// *   **Method:** `PATCH`
// *   **URL:** `http://localhost:8080/api/v1/incidents/<YOUR-INCIDENT-ID>/status`
// *   **Body (raw -> JSON):**
// ```json
// {
//   "status": "CLOSED",
//   "resolutionNote": "Scaling up nodes resolved the memory issue. System nominal."
// }
// ```
// *   **Result:** It will close the incident and fire the Slack notification immediately.

// **2. Test the AI Auto-Close Notification**
// *   **Method:** `POST`
// *   **URL:** `http://localhost:8080/api/v1/incidents/<YOUR-INCIDENT-ID>/close`
// *   **Body:** *(none)*
// *   **Result:** It will return `202 Accepted` immediately. In the background, the Python swarm will generate the note using Gemini, update the Java backend to `CLOSED`, and then the Java backend will trigger the Slack notification containing the AI's note.