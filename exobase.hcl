
service "auth-prod" {
  type      = "api"
  functions = ["auth/*"]
  variables = {
    "LOG_LEVEL" : "DEBUG"
    "ENV": "prod"
  }
  secrets = [
    "MAGIC_SECRET",
    "TOKEN_SIG_SECRET",
    "MONGO_USER_NAME",
    "MONGO_PASSWORD",
    "MONGO_INSTANCE_NAME",
    "MONGO_SUBDOMAIN",
    "GITHUB_APP_ID",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GITHUB_PRIVATE_KEY"
  ]
  on "aws:lambda" {
    methods = "ANY"
    timeout = 4000
    memory  = 36
  }
  on "gcp:functions" {
    size = 300
  }
}