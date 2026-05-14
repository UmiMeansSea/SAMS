# Software Requirements Specification (SRS) - OrgMap

## 1. Project Overview
**OrgMap** is a comprehensive Enterprise Personnel and Hierarchy Management System built on the MERN stack. It allows organizations to visualize their structure, manage personnel across multiple projects, and define complex reporting relationships through an interactive, drag-and-drop interface.

---

## 2. Core Features

### 2.1 Project Management
- **Multiple Workspaces**: Create separate projects for different departments or initiatives.
- **Switching & Deletion**: Seamlessly switch between projects via a dropdown. Delete projects to clear their specific personnel data.
- **Persistence**: Project metadata and personnel assignments are persisted in MongoDB.

### 2.2 Interactive Org Chart (Canvas)
- **React Flow Integration**: A highly dynamic canvas for visualizing the organization.
- **Person Nodes**: Custom nodes displaying name, role, and a small avatar. Hovering shows a detailed tooltip with bio and project membership.
- **Draggable Interface**: Manually position nodes to customize the layout.
- **Auto-Align Engine**: A custom alignment algorithm that organizes nodes into a clean vertical hierarchy with a single click.
- **Deletable Edges**: Defined relationships (Manager -> Report) can be visually deleted directly from the canvas.

### 2.3 Personnel & Profile Management
- **Centralized Profile Card**: A unified UI for viewing and editing personnel data.
- **Multi-Project Sync**: Personnel can be assigned to multiple projects simultaneously. Their profile automatically tracks and displays all project memberships.
- **Categorization**: Group people by department (Leadership, Engineering, HR, etc.).
- **Search**: Real-time search across the entire personnel database.
- **Image Upload**: Integrated with Cloudinary for high-performance profile picture hosting.

### 2.4 Hierarchy & Reporting
- **Nested Tree View**: A dedicated Right Sidebar displaying the reporting hierarchy in a tree structure.
- **Drag-and-Drop Re-parenting**: Drag a person onto another in the hierarchy to change their manager.
- **Root Node Promotion**: Drag a person to the top of the hierarchy to make them a root-level leader.

### 2.5 Data Operations
- **Excel/CSV Import**: Bulk upload personnel from spreadsheets.
- **JSON Export**: Export the current project's structure and data for backup or external use.

---

## 3. Technical Architecture

### 3.1 Technology Stack
- **Frontend**: React 18, React Flow (Canvas Engine), Tailwind CSS (Styling), Lucide-React (Icons).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODM).
- **Storage**: Cloudinary API for profile pictures.

### 3.2 Database Schema
#### **Project Model**
- `name`: String (required)
- `description`: String
- `lastSaved`: Date

#### **Person Model**
- `name`: String (required)
- `role`: String
- `email`: String
- `bio`: String
- `pfpUrl`: String (URL to image)
- `category`: String (Leadership, Manager, etc.)
- `projectId`: ObjectId (Legacy/Primary link)
- `projectIds`: Array of ObjectIds (Multi-project tracking)
- `managers`: Array of ObjectIds (Hierarchy links)
- `position`: { x, y } (Canvas coordinates)

---

## 4. API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/api/people` | GET | Fetches all personnel with populated project names. |
| `/api/people` | POST | Creates a new personnel record. |
| `/api/people/:id` | PATCH | Updates profile, hierarchy, or project assignments. |
| `/api/people/:id` | DELETE | Permanently removes a person from the database. |
| `/api/projects` | GET | Lists all available projects. |
| `/api/projects` | POST | Creates a new project workspace. |
| `/api/projects/:id` | DELETE | Deletes a project and its specific data. |
| `/api/projects/:id/people` | GET | Fetches personnel belonging to a specific project. |
| `/api/upload` | POST | Uploads an image file to Cloudinary. |

---

## 5. System Workflow

1. **Initialization**: The user creates a new project (e.g., "Engineering 2024").
2. **Data Entry**: The user imports a list of engineers from Excel or adds them manually via the Sidebar.
3. **Structuring**:
    - Users drag people from the Left Sidebar onto the Canvas.
    - Relationships are created by drawing lines between nodes or dragging in the Hierarchy Sidebar.
4. **Synchronization**: Alice is added to "Project A" and "Project B". When viewing her profile in either project, the "Projects Working On" section automatically shows both memberships.
5. **Layout Optimization**: The user clicks "Auto Align" to structure the canvas into a readable tree.
