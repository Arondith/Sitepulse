FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go mod tidy && go test ./... && CGO_ENABLED=0 go build -o /api .
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /api /api
ENTRYPOINT ["/api"]
