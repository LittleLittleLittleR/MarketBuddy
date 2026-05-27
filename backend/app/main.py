from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"root": "welcome to MarketBuddy"}

# AUTH
@app.post("/signup/")
def signup():
    # TODO
    return None

@app.post("/login/")
def login():
    # TODO
    return None

@app.post("/logout/")
def logout():
    # TODO
    return None

# STOCKS
@app.get("/stocks")
def get_all_stocks(limit: int = 10, offset: int = 0):
    # TODO
    return None

@app.get("/stocks/{stock_id}")
def get_stock(stock_id: int):
    # TODO
    return None

# WATCHLIST
@app.get("/watchlist/{user_id}")
def get_watchlist(user_id: int):
    # TODO
    return None

@app.post("/watchlist/{user_id}")
def add_watchlist(user_id: int):
    # TODO
    return None

@app.delete("/watchlist/{user_id}")
def remove_watchlist(user_id: int):
    # TODO
    return None