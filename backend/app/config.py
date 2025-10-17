from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.dev",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "App Sante"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+pysqlite:///:memory:"
    redis_url: str = "redis://localhost:6379/0"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    secret_key: str = "dev-secret-key-change-in-prod"
    admin_registration_secret: str = "change-this-admin-secret-in-prod"
    access_token_exp_minutes: int = 15
    refresh_token_exp_days: int = 14
    refresh_token_cookie_name: str = "refresh_token"
    refresh_token_cookie_secure: bool = False
    refresh_token_cookie_domain: str | None = None
    refresh_token_cookie_path: str = "/"
    refresh_token_cookie_same_site: str = "strict"
    login_rate_limit_per_ip: int = 10
    login_rate_limit_per_email: int = 10
    login_rate_limit_window_seconds: int = 60


settings = Settings()
