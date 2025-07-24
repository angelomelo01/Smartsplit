import fastapi as fap
from fastapi.middleware.cors import CORSMiddleware
import utils 
import json

app = fap.FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def root():
    '''
    
    '''
    return fap.responses.JSONResponse(status_code=200, content='Angelo and Joe - WIT Senior Project 2025')


@app.get('/auth')
async def authorize_user(request: fap.requests.Request) -> str:
    '''
    Returns user UUID
    '''
    auth = request.headers.get('authorization')
    user_email = auth.split(sep=' ')[1]
    rv = utils.setup_user_dir(email=user_email)
    user_id = utils.get_user_info(user_email=user_email).get('uuid')
    
    return user_id


@app.get('/groups/{user_id}')
async def get_groups(user_id:str):
    '''
    '''
    user_id = user_id.replace('"', '')
    groups = utils.get_user_groups(user_id=user_id)
    
    return groups


@app.post('/groups/{user_id}')
async def add_group(user_id:str, request:fap.requests.Request):
    '''
    '''
    user_id = user_id.replace('"', '')
    body:bytes = await request.body()
    group = json.loads(body)
    rv = utils.create_group(user_id=user_id, new_group_data=group)
    return fap.responses.JSONResponse(status_code=200, content=rv)


@app.post('/expense/{user_id}')
async def add_expense(user_id:str, request:fap.requests.Request):
    expense = {
        'description': request.headers.get('description'),
        'amount': request.headers.get('amount'),
        'groupId': request.headers.get('groupId'),
        'participants': request.headers.get('participants'),
        'splitType': request.headers.get('splitType'),
        'category': request.headers.get('category'),
        'paidBy': request.headers.get('paidBy'),
        'createdBy': request.headers.get('createdBy'),
        'createdAt': request.headers.get('createdAt'),
        'isSettled' : False
    }
    utils.add_expense(user_id.replace('"', ''), expense)

    return None

@app.post('/settle/{user_id}/{expense_id}')
async def settle_expense(user_id:str, expense_id:str, request: fap.requests.Request):
    '''
    {
        "amount": 25.50,
        "settled_with": "other_user_id_or_name",
        "settlement_date": "2025-01-23",
        "notes": "Settlement between User and John Doe",
        "type": "payment_made" // or "payment_received"
    }
    '''
    user_id = user_id.replace('"', '')
    expense_id = expense_id.replace('"', '')
    print(f'expense_id: {expense_id}')
    print(f'user_id: {user_id}')
    body:bytes = await request.body()
    settled_expense = json.loads(body)
    rv = utils.settle_expense(
        expense_data=settled_expense,
        expense_id = expense_id
    ) 
    return None


@app.get('/balances/{user_id}')
async def get_outstanding_balances(user_id:str):
    '''
    '''
    user_id = user_id.replace('"', '')
    return utils.process_all_expenses(user_id=user_id)



@app.get('/expense/{user_id}')
async def get_recent_expenses(user_id: str):
    '''
    '''
    user_id = user_id.replace('"', '')
    rv = utils.get_all_expenses(user_id=user_id)
    return rv 


@app.get('/join-group/{user_id}/{group_alias}')
async def join_group(user_id:str, group_alias:str):
    '''
    '''
    user_id = user_id.replace('"', '')
    rv = utils.join_group(user_id, group_alias)
    return None


@app.get('/recent-expense/{user_id}')
async def get_recent_expenses(user_id: str):
    '''
    '''
    user_id = user_id.replace('"', '')
    rv = utils.get_formatted_recent_expenses(user_id)
    
    return rv
