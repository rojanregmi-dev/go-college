"""Add optional, repeatable campus plans for a two-account live demo."""

import argparse

from app.main import SessionLocal
from app.models import Activity, UserProfile


DEMO_PLANS = [
    ("Pickup basketball at the rec", "Activity", "Basketball Runs", "Now", "Student Rec Center", "basketball.png", 5, "Casual pickup game. Bring water and jump in for a few rounds."),
    ("Calc review together", "Activity", "Calc Crew", "Today", "Alkek Library", "study.png", 4, "Work through practice problems together before the quiz."),
    ("Coffee between classes", "Meet", "", "Now", "LBJ Student Center", "coffee.png", 1, "Grab a coffee and catch up before the next class."),
    ("Gym buddy for leg day", "Meet", "", "Tonight", "Student Rec Center", "fitness.png", 1, "Looking for a workout partner for a light leg-day session."),
    ("Three-point shootaround", "Activity", "Rec Court Crew", "Tonight", "Student Rec Center", "basketball.png", 4, "A relaxed shootaround for anyone who wants to play."),
    ("Build a hackathon team", "Activity", "GO Builders", "This Week", "Alkek Library", "study.png", 5, "Bring an idea or join one. We will pair up and make a prototype."),
    ("Coffee after lecture", "Meet", "", "Today", "LBJ Student Center", "coffee.png", 1, "Free after lecture and up for a quick conversation."),
    ("Early workout partner", "Meet", "", "Today", "Student Rec Center", "fitness.png", 1, "An easy workout together before the day gets busy."),
    ("Lunch break basketball", "Activity", "Lunch Break Runs", "Today", "Student Rec Center", "basketball.png", 6, "Short games over lunch. All skill levels welcome."),
    ("Study with me at Alkek", "Meet", "", "Tonight", "Alkek Library", "study.png", 1, "Quiet company while we finish assignments at the library."),
    ("Meet someone new over coffee", "Meet", "", "This Week", "LBJ Student Center", "coffee.png", 1, "A low-key coffee chat to meet someone on campus."),
    ("Rec center workout circuit", "Activity", "Workout Circuit", "This Week", "Student Rec Center", "fitness.png", 4, "Try a friendly circuit together. Beginners are welcome."),
]


def seed_demo(db, owner):
    existing_titles = {
        title
        for (title,) in db.query(Activity.title).filter(
            Activity.creator_code == owner.user_code,
            Activity.photo_url.like("/demo-images/%"),
        )
    }
    new_posts = []

    for title, category, group_name, period, location, image, capacity, description in DEMO_PLANS:
        if title in existing_titles:
            continue
        new_posts.append(
            Activity(
                title=title,
                category=category,
                group_name=owner.username if category == "Meet" else group_name,
                period=period,
                location=location,
                latitude=29.88994,
                longitude=-97.93945,
                description=description,
                photo_url=f"/demo-images/{image}",
                creator_code=owner.user_code,
                creator_photo_url=owner.photo_url,
                max_people=capacity,
                interested_count=0,
            )
        )

    db.add_all(new_posts)
    db.commit()
    return len(new_posts)


def main():
    parser = argparse.ArgumentParser(description="Seed GO Discover demo plans")
    parser.add_argument("--owner-code", help="User ID of the account that will accept requests")
    args = parser.parse_args()

    with SessionLocal() as db:
        query = db.query(UserProfile).filter(UserProfile.email.isnot(None))
        if args.owner_code:
            query = query.filter(UserProfile.user_code == args.owner_code)
        owner = query.order_by(UserProfile.id).first()
        if owner is None:
            parser.error("Create a login account first, then run this command again")

        added = seed_demo(db, owner)
        print(f"Added {added} demo plans for {owner.username} ({owner.user_code}).")
        print("Sign in with a second account to request; this account can accept.")


if __name__ == "__main__":
    main()
