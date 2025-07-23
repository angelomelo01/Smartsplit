import fastapi as fap
from fastapi.middleware.cors import CORSMiddleware
import utils 

app = fap.FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def get_groups(user_id:str, request: fap.requests.Request):
    '''
    '''
    user_id = user_id.replace('"', '')
    groups = utils.get_user_groups(user_id=user_id)

    print(groups)
    return groups


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
        'createdAt': request.headers.get('createdAt')
    }
    utils.add_expense(user_id.replace('"', ''), expense)

    return None


@app.get('/balances/{user_id}')
async def get_outstanding_balances(user_id:str):
    '''
    '''
    user_id = user_id.replace('"', '')
    return utils.process_all_expenses(user_id=user_id)


@app.get('/recent-expense/{user_id}')
async def get_recent_expenses(user_id: str):
    '''
    '''
    user_id = user_id.replace('"', '')
    return utils.get_formatted_recent_expenses(user_id)
