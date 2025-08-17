"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
import json
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities with user management")

# Mount the static files directory
# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load users from users.json
USERS_FILE = os.path.join(current_dir, "users.json")
def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def get_user(username):
    users = load_users()
    for user in users:
        if user["username"] == username:
            return user
    return None

security = HTTPBasic()

def get_current_user(credentials: HTTPBasicCredentials = Depends(security)):
    user = get_user(credentials.username)
    if not user or not secrets.compare_digest(user["password"], credentials.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

 # In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, user=Depends(get_current_user)):
    """Sign up the current user for an activity (email auto-bound to user)"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity = activities[activity_name]
    # 綁定 email: teacher1 -> teacher1@mergington.edu, student1 -> student1@mergington.edu
    email = f"{user['username']}@mergington.edu"
    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, target_email: str = None, user=Depends(get_current_user)):
    """Unregister a student from an activity. Teacher can remove anyone, student只能移除自己。"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity = activities[activity_name]
    # 綁定 email: teacher1 -> teacher1@mergington.edu, student1 -> student1@mergington.edu
    user_email = f"{user['username']}@mergington.edu"
    if user["role"] == "teacher":
        # 老師可移除任何人
        if not target_email or target_email not in activity["participants"]:
            raise HTTPException(status_code=400, detail="Target email not found in participants")
        activity["participants"].remove(target_email)
        return {"message": f"Unregistered {target_email} from {activity_name}"}
    elif user["role"] == "student":
        # 學生只能移除自己
        if user_email not in activity["participants"]:
            raise HTTPException(status_code=400, detail="You are not signed up for this activity")
        activity["participants"].remove(user_email)
        return {"message": f"Unregistered {user_email} from {activity_name}"}
    else:
        raise HTTPException(status_code=403, detail="Permission denied.")
