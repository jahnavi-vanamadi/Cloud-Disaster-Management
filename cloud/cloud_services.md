# ResQCloud — Cloud Services and Integration

## 1. Overview

ResQCloud is a cloud-based disaster management system designed to support disaster reporting, incident tracking, emergency resource management, and centralized data storage.

## 2. Cloud Services

### 2.1 Firebase Hosting

**Purpose:** Hosts and publishes the ResQCloud web application.

**Status:** Deployed.

**Project ID:** `resqcloud-3e809`

**Website:** https://resqcloud-3e809.web.app/

### 2.2 Cloud Firestore

**Purpose:** Stores disaster reports and related application data in a cloud database.

**Collection:** `disaster_reports`

**Status:** Disaster report documents are present in the database.

### 2.3 Firebase Authentication

**Purpose:** Provides user authentication for secure access to the application.

**Configured sign-in method:** Email/Password.

**Status:** Email/Password sign-in is enabled in the Firebase Console.

### 2.4 Firebase Realtime Database

**Purpose:** Stores data in a cloud-hosted, real-time NoSQL database.

**Database URL:** `https://resqcloud-3e809-default-rtdb.asia-southeast1.firebasedatabase.app`

**Test Data:** `cloud_service_test`

**Status:** Database created successfully, and test data added and verified in the Firebase Console.

**Plan:** Firebase Spark (no-cost plan).


## 3. Integration Overview

The ResQCloud application uses Firebase services to host its web interface, store disaster information, and support user authentication.

The integration between the website and each Firebase service must be tested to confirm that the relevant application features use the configured services correctly.

## 4. Cloud Run

Cloud Run was investigated as a possible platform for deploying backend APIs. The Cloud Run Admin API could not be enabled because the current account does not have the required permission.

No Cloud Run service has been deployed.

## 5. Current Limitations

* Cloud Run deployment is pending resolution of the API permission issue.
* The required number and type of cloud services must be confirmed against the project evaluation criter
## 7. Cloud Services Testing Results

The ResQCloud cloud services were tested successfully.

| Cloud Service              | Test Result                                          |
| -------------------------- | ---------------------------------------------------- |
| Firebase Hosting           | Website deployed successfully                        |
| Cloud Firestore            | Connected successfully; disaster reports can be read |
| Firebase Authentication    | Initialized successfully                             |
| Firebase Realtime Database | Connected successfully; test data retrieved          |

### Realtime Database Security

The Realtime Database contains a `cloud_service-test` node with sample project information.

Database rules allow reading the test node while keeping write access disabled. Access to other database paths remains restricted.

### Testing Limitations

* Firebase Authentication initialization was verified, but actual user login has not yet been tested.
* Cloud Run deployment remains pending because the required API permission was unavailable.
* Each cloud service was tested individually; full integration with every ResQCloud module remains future work.
