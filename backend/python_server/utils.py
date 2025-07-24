import os
import shutil
import json
import uuid
import datetime
from tinydb import TinyDB, Query, where
from pprint import pprint as pp 

####################################################################################################
# Setup
####################################################################################################

home_dir = os.getcwd()
data_dir = os.path.join(home_dir, 'data')
try:
    os.mkdir(data_dir)
except Exception as e:
    pass

USER_DATA_DB_PATH = os.path.join(data_dir, 'user_data.json')

####################################################################################################
# Function definitions
####################################################################################################
def setup_user_dir(email: str) -> os.PathLike:
    '''
    Creates a unique directory fro this user, if one does not exist yet.
    Returns this users data directory.
    '''
    db = TinyDB( USER_DATA_DB_PATH ).table('user')
    user = Query()
    records = db.search(user.email == email)
    
    if not records:
        uid = uuid.uuid4().__str__()
        user_dir = os.path.join(
            data_dir,
            uid
        )     
        os.mkdir(user_dir)
        db.insert(
            {
                'email' : email,
                'data_dir' : user_dir,
                'uuid' : uid,
                'id' : uid,
                'name' : email.split('@')[0],
                'groups' : [],
                'expense_id_list' : []
            }
        )
        with open(os.path.join(user_dir, email.split('@')[0]), 'w') as stream:
            stream.write('')
            
    else:
        user_dir = records[0].get('data_dir')

    return user_dir


def get_user_info(user_email: str) -> dict:
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH).table('user')
    user = Query()
    rv = db.search(user.email == user_email)[0]
    return rv

def create_group(user_id:str, new_group_data:dict):
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH)
    use_query = Query()
    user = db.table('user').search(use_query.uuid == user_id)[0]
    
    # Sanitize group data
    for k in new_group_data.keys():
        if isinstance(new_group_data[k], str):
            new_group_data[k] = new_group_data[k].replace('"', '')
        if isinstance(new_group_data[k], list):
            newList = []
            for i in new_group_data[k]:
                if isinstance(i, str):
                    newList.append(i.replace('"', ''))
                else:
                    newList.append(i)

    new_group_data.get('members').append({
        'email' : user.get('email')
    })

    new_id =  uuid.uuid4().__str__()
    new_group = {
        'friendly_id' : db.table('group')._get_next_id(),
        'key': new_id,
        'group_id' : new_id,
        'id' : new_id,
        'name': new_group_data.get('name'),
        'description': new_group_data.get('description'),
        'members': new_group_data.get('members'),
        'totalExpenses': 0,
        'createdBy': user_id,
        'createdAt': datetime.datetime.now().strftime('%Y-%m-%d'),
        'recentActivity': new_group_data.get('recent_activity')
    }

    groups:list = user.get('groups')
    if not groups:
        groups = [new_group]
    else:
        groups.append(new_group)

    db.table('group').insert(new_group)

    for member in new_group_data.get('members'):
        user = get_user_info(member.get('email'))
        group_id_list = user.get('groups')
        if not group_id_list: group_id_list = []
        group_id_list.append(new_group.get('group_id'))
        
        db.table('user').update(
            cond = use_query.email == member.get('email'),
            fields= {'groups' : group_id_list}
        )

    return new_id


def get_user_groups(user_id:str) -> dict:
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH)
    user = Query()
    rv = db.table('user').search(user.id == user_id)
    rv = rv[0]
    
    groups:list[dict] = rv.get('groups')
    
    group_list = []
    for group_id in groups:
        member_list = []
        group = db.table('group').search(Query().group_id == group_id)[0]
        members = group.get('members')
        for member in members:
            user_info = get_user_info(member.get('email'))
            member_list.append(
                {
                    'id' : user_info.get('uuid'),
                    'name' : user_info.get('name'),
                    'email' : user_info.get('email')
                }
            )

        group['members'] = member_list
        group_list.append(group)

    return group_list

def get_group(group_id:str) -> dict:
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH)
    rv = db.table('group').search(Query().id == group_id)
    rv = rv[0]
    return rv

def add_expense(user_id:str, expense:dict):
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH)

    expense['id'] = uuid.uuid4().__str__()
    participants = expense['participants'].replace('[', '').replace(']', '')
    participants = participants.split(',')
    expense['participants'] = [p.replace('"', '') for p in participants]
    
    for k in expense.keys():
        if isinstance(expense[k], str):
            expense[k] = expense[k].replace('"', '')
        if isinstance(expense[k], list):
            newList = []
            for i in expense[k]:
                if isinstance(i, str):
                    newList.append(i.replace('"', ''))
                else:
                    newList.append(i) 

    db.table('expense').insert(
        expense
    )
    
    # Update group
    group = db.table('group').search(Query().id == expense['groupId'])[0]
    total_expenses = group['totalExpenses']
    db.table('group').update(
        cond= Query().id == expense['groupId'],
        fields= {'totalExpenses' : total_expenses + float(expense['amount'])}
    )

    # Update participants
    for p in expense['participants']:
        user = db.table('user').search(Query().id == p)[0]
        expense_list:list = user.get('expense_id_list')
        if not expense_list: expense_list = []
        expense_list.append(expense.get('id'))
        
        db.table('user').update(
            cond= Query().uuid == p,
            fields={'expense_id_list' : expense_list}
        )

    return 


def calculate_equal_split(balance, paid_by, participants, current_user_id):
    """
    Calculate who owes what in an equal split expense.
    
    Args:
        balance (float): Total amount of the expense
        paid_by (str): ID of the person who paid
        participants (list): List of participant IDs
        current_user_id (str): ID of the current user viewing the split
    
    Returns:
        list: Array of dictionaries with id, amount, and type
    """
    # Convert balance to float if it's a string
    balance = float(balance)
    
    # Calculate equal share per person
    equal_share = balance / len(participants)
    
    # Calculate what each person should pay/receive
    # If you paid, you should receive (total - your_share) from others
    # If you didn't pay, you owe your equal share
    
    result = []
    
    for participant_id in participants:
        if participant_id == current_user_id:
            continue  # Skip current user
        
        if current_user_id == paid_by:
            # Current user paid, so others owe them their share
            result.append({
                "id": participant_id,
                "amount": round(equal_share, 2),
                "type": "owes_you"
            })
        elif participant_id == paid_by:
            # This participant paid, so current user owes them their share
            result.append({
                "id": participant_id,
                "amount": round(equal_share, 2),
                "type": "you_owe"
            })
        # If neither current user nor this participant paid, 
        # then both owe the person who paid, so no direct debt between them
    
    return result


def consolidate_expense_results(all_expense_results):
    """
    Consolidate multiple expense results into net amounts per person.
    
    Args:
        all_expense_results (list): List of expense results from calculate_equal_split
    
    Returns:
        list: Consolidated results with net amounts
    """
    # Dictionary to track net amounts per person
    # Positive = they owe you, Negative = you owe them
    net_balances = {}
    
    # Process all expense results
    for expense_result in all_expense_results:
        for person in expense_result:
            person_id = person['id']
            amount = person['amount']
            
            # Initialize if not seen before
            if person_id not in net_balances:
                net_balances[person_id] = 0
            
            # Add or subtract based on type
            if person['type'] == 'owes_you':
                net_balances[person_id] += amount
            elif person['type'] == 'you_owe':
                net_balances[person_id] -= amount
    
    # Convert to final result format
    consolidated_result = []
    for person_id, net_amount in net_balances.items():
        if net_amount > 0:
            consolidated_result.append({
                "id": person_id,
                "amount": round(net_amount, 2),
                "type": "owes_you"
            })
        elif net_amount < 0:
            consolidated_result.append({
                "id": person_id,
                "amount": round(abs(net_amount), 2),
                "type": "you_owe"
            })
    
    return consolidated_result


def process_all_expenses(user_id):
    """
    Process all expenses and return consolidated results
    """
    db = TinyDB(USER_DATA_DB_PATH)
    user = db.table('user').search(Query().id == user_id)[0]
    expense_id_list = user.get('expense_id_list')
    
    all_results = []
    
    for expense_id in expense_id_list:
        expense = db.table('expense').search(Query().id == expense_id)[0]
        if expense.get('isSettled'): continue

        balance = expense['amount']
        paid_by = expense['paidBy']
        participants = expense['participants']
        split_method = expense['splitType']
        
        if split_method == 'equal':
            split_result = calculate_equal_split(balance, paid_by, participants, user_id)
            all_results.append(split_result)
    
    # Consolidate all results
    consolidated = consolidate_expense_results(all_results)

    named_result = []
    for result in consolidated:
        user_name = db.table('user').search(Query().id == result['id'])[0].get('name')
        result['name'] = user_name
        named_result.append(
            result
        )
    
    return named_result

def get_all_expenses(user_id:str):
    """
    Process all expenses and return consolidated results
    """
    db = TinyDB(USER_DATA_DB_PATH)
    user = db.table('user').search(Query().id == user_id)[0]
    expense_id_list = user.get('expense_id_list')
    
    all_results = []
    
    for expense_id in expense_id_list:
        expense = db.table('expense').search(Query().id == expense_id)[0]
        balance = expense['amount']
        paid_by = expense['paidBy']
        participants = expense['participants']
        split_method = expense['splitType']
        
        if split_method == 'equal':
            split_result = calculate_equal_split(balance, paid_by, participants, user_id)
            all_results.append(split_result)
        
    # Consolidate all results
    consolidated = consolidate_expense_results(all_results)

    named_result = []
    for idx, result in enumerate(consolidated):
        user_name = db.table('user').search(Query().id == result['id'])[0].get('name')
        result['name'] = user_name
        result['id'] = expense_id_list[idx]
        named_result.append(
            result
        )
    
    return named_result


def get_group_expenses(group_id:str):
    """
    Process all expenses and return consolidated results
    """
    db = TinyDB(USER_DATA_DB_PATH)
    group_data = db.table('group').search(Query().id == group_id)[0]
    members = group_data.get('members')
    
    # Get expense for this group
    all_results = []
    expense_id_list = []
    expense_data_list = db.table('expense').search(Query().groupId == group_data['id'])
    for expense in expense_data_list:
        expense_id_list.append(expense['id'])
        balance = expense['amount']
        paid_by = expense['paidBy']
        participants = expense['participants']
        split_method = expense['splitType']
        
        if split_method == 'equal':
            split_result = calculate_equal_split(balance, paid_by, participants, expense['createdBy'])
            all_results.append(split_result)
        
    # Consolidate all results
    consolidated = consolidate_expense_results(all_results)

    named_result = []
    for idx, result in enumerate(consolidated):
        user_name = db.table('user').search(Query().id == result['id'])[0].get('name')
        result['name'] = user_name
        result['id'] = expense_id_list[idx]
        named_result.append(
            result
        )
    
    return named_result
    


def format_expense_for_display(expense, current_user_id, name=None):
    """
    Transform expense data to match the required format
    """
    from datetime import datetime, timezone
    
    # Parse the date
    expense_date = datetime.fromisoformat(expense['createdAt'].replace('Z', '+00:00'))
    current_date = datetime.now(timezone.utc)
    
    # Calculate relative date
    days_diff = (current_date.date() - expense_date.date()).days
    
    if days_diff == 0:
        date_str = "Today"
    elif days_diff == 1:
        date_str = "Yesterday"
    elif days_diff < 7:
        date_str = f"{days_diff} days ago"
    else:
        date_str = expense_date.strftime("%b %d")  # e.g., "Jul 22"
    
    # Get paidBy name or "You"
    paid_by_id = expense['paidBy']
    if paid_by_id == current_user_id:
        paid_by_name = "You"
    else:
        db = TinyDB(USER_DATA_DB_PATH)
        username = db.table('user').search(Query().id == expense['paidBy'])[0].get('name')
        paid_by_name = username if username else 'Friend'
    
    return {
        'id': expense['id'],
        'description': expense['description'],
        'amount': round(float(expense['amount']), 2),
        'date': date_str,
        'paidBy': paid_by_name
    }

def get_three_most_recent_expenses_simple(db, user_id=None):
    """
    Alternative version that works with string comparison if timestamps are ISO formatted.
    This is simpler and works well when timestamps are consistently formatted.
    """
    expense_table = db.table('expense')
    
    if user_id:
        # Get expenses where user is a participant
        Query_obj = Query()
        all_expenses = expense_table.search(Query_obj.participants.any([user_id]))
    else:
        # Get all expenses
        all_expenses = expense_table.all()
    
    # Sort by createdAt string (works for ISO format timestamps)
    sorted_expenses = sorted(
        all_expenses, 
        key=lambda x: x['createdAt'],
        reverse=True
    )
    
    # Return the first 3 (most recent)
    return sorted_expenses[:3]


def get_formatted_recent_expenses(current_user_id, limit=3):
    """
    Get the most recent expenses formatted for display
    
    Args:
        db: TinyDB database instance
        current_user_id (str): Current user's ID
        limit (int): Number of recent expenses to return (default 3)
    
    Returns:
        list: Formatted expense data matching the required structure
    """
    db = TinyDB(USER_DATA_DB_PATH)
    # Get recent expenses for the user
    recent_expenses = get_three_most_recent_expenses_simple(db, current_user_id)
    
    # Format each expense
    formatted_expenses = []
    for expense in recent_expenses[:limit]:
        formatted = format_expense_for_display(expense, current_user_id)
        formatted_expenses.append(formatted)
    
    return formatted_expenses


def settle_expense(user_id:str):
    '''
    '''
    db = TinyDB(USER_DATA_DB_PATH)
    results = db.table('expense').search(where('participants').any([user_id]))
    if not results:return

    user_data = db.table('user').search(Query().id == user_id)[0]

    # Update expense    
    rm_expense_list = []
    for expense in results:
        rm_expense_list.append(expense['id'])
        expense['amount'] = float(expense['amount']) / len(expense['participants'])
        expense['participants'] = list(expense['participants'])
        expense['participants'].remove(user_id)
        db.table('expense').update(
            cond=Query().id == expense['id'],
            fields=expense
        )

    # Update user
    print(f'user_data[expense_id_list]: {user_data['expense_id_list']}')
    for exp_id in rm_expense_list:
        print(f'exp_id: {exp_id}')
        user_data['expense_id_list'].remove(exp_id)
    db.table('user').update(
        cond=Query().id == user_id,
        fields=user_data
    )
    return None


def join_group(user_id:str, group_doc_id:str):
    '''
    `group_doc_id` is the document ID in TinyDB
    '''
    db = TinyDB(USER_DATA_DB_PATH)
    
    print(f'group_doc_id: {group_doc_id}')
    group_data = db.table('group').get(doc_id=group_doc_id)
    print(f'group_data: {group_data}')
    
    user_data = db.table('user').search(Query().id == user_id)[0]
    
    print(f'user_data[groups]: {user_data['groups']}')
    user_data['groups'].append(group_data.get('id'))
    
    # update group memebers
    group_data.get('members').append(
        {
            'email' : user_data.get('email')
        }
    )
    db.table('group').update(
        cond = Query().id == group_data['id'],
        fields=group_data
    )
    
    # Update user table
    db.table('user').update(
        cond=Query().id == user_id,
        fields=user_data
    )
    return None


if __name__ == '__main__':
    my_email = 'anxhelomelo@icloud.com'
    setup_user_dir('mike@example.com')
    setup_user_dir(my_email)
    
    # my_uuid = get_user_info(my_email).get('uuid')
    # print(f'my_uuid: {my_uuid}')

    # new_group = {
    #   'name': "Trip to Vegas",
    #   'description': "Bachelor party expenses",
    #   'members': [
    #     { 'email' : "mike@example.com" },
    #     { 'email' : "lisa@example.com" },
    #     { 'email' : "tom@example.com" }
    #   ],
    #   'created_by': "user4",
    #   'created_at': "2024-01-10",
    #   'recent_activity': "Added 'Hotel booking' expense 1 week ago"
    # }

    # # rv = create_group(my_uuid, new_group)

    # pp(
    #     process_all_expenses(my_uuid)
    # )

    # pp(
    #     get_formatted_recent_expenses(my_uuid)
    # )
    
    # get_user_groups('3df55806-3ad2-4c9d-aaad-61a42a03d032')