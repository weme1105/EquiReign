# EquiReign API

ASP.NET Core 10 LTS + EF Core + PostgreSQL 題庫服務。

目前邊界只包含：題目查詢、固定闖關映射、難度挑戰隨機抽題。題目解答保存在資料庫供匯入驗算，但 API 不回傳解答。

```bash
docker compose -f backend/docker-compose.yml up -d
dotnet tool restore
dotnet run --project backend/EquiReign.Api
```

正式環境必須以 Secret／環境變數覆蓋 `ConnectionStrings__GameDatabase`，不可使用範例密碼。
