

service "core-api" {
  functions = [
    "auth.*",
    "platforms.*"
  ]
}