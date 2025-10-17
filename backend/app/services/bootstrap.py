from contextlib import closing

from app.db.models import Language, Specialty
from app.db.session import SessionLocal

DEFAULT_SPECIALTIES = [
    ("general-medicine", "General Medicine"),
    ("pediatrics", "Pediatrics"),
    ("dentistry", "Dentistry"),
    ("cardiology", "Cardiology"),
    ("dermatology", "Dermatology"),
]

DEFAULT_LANGUAGES = [
    ("en", "English"),
    ("fr", "French"),
    ("es", "Spanish"),
    ("de", "German"),
]


def seed_reference_data() -> None:
    with closing(SessionLocal()) as db:
        specialties_changed = False
        for slug, name in DEFAULT_SPECIALTIES:
            if not db.query(Specialty).filter(Specialty.slug == slug).first():
                db.add(Specialty(slug=slug, name=name))
                specialties_changed = True

        languages_changed = False
        for code, name in DEFAULT_LANGUAGES:
            if not db.query(Language).filter(Language.code == code).first():
                db.add(Language(code=code, name=name))
                languages_changed = True

        if specialties_changed or languages_changed:
            db.commit()
