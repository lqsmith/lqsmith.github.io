/* TODO's
        Sequence Animations, dialog appearances
        Use QR Codes or use unique ID per host
        Hide words after animation completes
        Implement menu
        Disconnecting players
        Check various screen sizes
        Add AI player
        Handle dropped players
        Only allow game start if each team has one spymaster and at least one agent
        Use words from actual game
        Stylish fonts
        Make web app for mobile
        block selections
*/        

"use strict";

const peerConfig = {'iceServers' : [{'urls':'stun:stun.l.google.com:19302'}, {'url':'stun:stun.l.google.com:19302'}],
                    'sdpSemantics': 'unified-plan'};

const CONN_ID = 'LQMS_CN_TEST';

const MODE_HOST         = 0;
const MODE_CLIENT       = 1;

const RED               = 0;
const BLUE              = 1;
const BLACK             = 2;
const BROWN             = 3;

const centerText = '<img src="textalign.bmp" class="textalignment">';

let mode;
let players = [];
let boardState = [];
let playerName;
let playerTeam = RED;
let playerSpymaster = false;
let currentTurn = null;
let redRemain = 0;
let blueRemain = 0;
let foundAssassin = BLACK;
let gameOver = false;
let peer = null;
let channel = null;

$(main);

function main()
{
	uiInit();
    getPlayerName().then(() => 
    getGameMode()).then(() =>
	connectPlayers()).then(() => 
    gmStartGame());
}

function getGameMode()
{
    return uiGetGameMode().then(md =>
    {
        mode = md;
    });
}

function connectPlayers()
{
    if(mode == MODE_HOST)
    {
        uiAddPlayer(playerName, RED, true);

        return startHost().then(() =>
        uiConnectPlayers());
    }
    else
    {
        return startClient().then(() =>
        uiWaitForGameStart());
   }
}

function startHost()
{
    return new Promise(function(resolve, reject) 
    {
        peer = new Peer(CONN_ID, {});
        peer.resolve = resolve;
        peer.reject = reject;
        peer.on('open', connectionOpenedHost);
        peer.on('connection', channelOpenedHost);
        peer.on('disconnected', channelClosed);
        peer.on('close', connectionClosed);
        peer.on('error', connectionError);
    });
}

function startClient()
{
    return new Promise(function(resolve, reject) 
    {
        peer = new Peer({});
        peer.resolve = resolve;
        peer.reject = reject;
        peer.on('open', connectionOpenedClient);
        peer.on('disconnected', channelClosed);
        peer.on('close', connectionClosed);
        peer.on('error', connectionError);
    });
}

function connectionOpenedHost(id)
{
    peer.resolve();
}

function connectionOpenedClient(id)
{
    channel = peer.connect(CONN_ID, {reliable: true, serialization: 'json'});
    channel.on('open', channelOpenedClient);
}

function channelOpenedHost(ch)
{
    players.push({channel: ch});
    ch.on('data', messageReceived);
    ch.on('close', channelClosed);
    ch.on('error', channelError);
}

function channelOpenedClient()
{
    players.push({channel: channel});
    channel.on('data', messageReceived);
    channel.on('close', channelClosed);
    channel.on('error', channelError);
    peer.resolve();
    gmTriggerEvent(SET_NAME, playerName);
}

function channelError()
{
    // TODO
}

function channelClosed()
{
    // TODO
}

function connectionClosed()
{
    // TODO
}

function connectionError()
{
    // TODO
}

function getPlayerName()
{
    return uiGetPlayerName().then(name =>
    {
        playerName = name;
    });
}

function messageReceived(cmd)
{
   	console.log('RX: ' + CMD_STR[cmd.cmd]);
    gmHandleEvent(cmd.cmd, cmd.data);
}

function setPlayerRoles(getPlayerData)
{
    let data = getPlayerData(0);
    playerTeam = data.team;
    playerSpymaster = data.spymaster;
    for(let i = 0; i < players.length; i++)
    {
        let data = getPlayerData(i + 1);
        players[i].team = data.team;
        players[i].spymaster = data.spymaster;
    }
}

function rand(max)
{
    return Math.floor(Math.random() * max);
}

function shuffle(array)
{
    var currentIndex = array.length;
    var temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) 
    {
        // Pick a remaining element...
        randomIndex = rand(currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
}

const UISTATE_NO_INPUT        = 0;
const UISTATE_CLUE            = 1;
const UISTATE_GUESS           = 2;

let uiState = UISTATE_NO_INPUT;

let uiGetNameDialog;
let uiGetClueDialog;
let uiGetModeDialog;
let uiGetPlayersDialog;
let uiMessageOutDialog;
let uiMessageInDialog;
let uiAlertDialog;

function uiInit()
{
	$('#menu').button();
	$('#menu').click(uiMenuClicked);

    $('#action').button();
    $('#action').click(uiActionButtonClicked);
    $('#action').hide();

	for(let row = 0; row < 5; row++)
	{
		for(let col = 0; col < 5; col++)
		{
            let card = $('.card.card-row-' + row + '.card-col-' + col);
			card.click(uiCardClicked);
		}
	}

    uiGetNameDialog = $('<div title="Welcome">Hello. What is your name?<br><br><input id="nameEntry" placeholder="Enter name"></input></div>');
    uiGetNameDialog.dialog(
    {
        modal: true,
        buttons: [{
            text: 'OK',
            click: function() {
                $(this).dialog("close");
            },
        }],
        beforeClose: function(event, ui) 
        {
            let name = $('#nameEntry').val();
            if(name == "")
            {
                return false;
            }
            else
            {
            	$('#nameEntry').val('');
                uiGetNameDialog.resolve(name);
                return true;
            }
        },
        autoOpen: false,
    });
	
	styleTextBox($('#nameEntry'));
	uiGetNameDialog.parent().find('.ui-dialog-titlebar-close').css('display', 'none');
	$('#nameEntry').val('Player' + rand(1000));

	uiGetClueDialog = $('<div title="Send Clue">Enter a one word clue and the number of associated words.<br><br><input id="clueEntry" placeholder="Enter clue"></input><input id="guessEntry"></input></div>');
	uiGetClueDialog.dialog(
    {
        modal: true,
        buttons: [{
            text: 'OK',
            click: function() {
                $(this).dialog("close");
            },
        }],
        beforeClose: function(event, ui) 
        {
            let clue = $('#clueEntry').val();
            if(clue == "")
            {
                return false;
            }

            let num = $('#guessEntry').val();
            if(num == "")
            {
                return false;
            }

            clue = clue.toUpperCase();
            gmTriggerEvent(SEND_CLUE, {clue: clue, num: num});
           	$('#clueEntry').val('');
           	$('#guessEntry').val('0');
            return true;
        },
        autoOpen: false,
    });
	
	styleTextBox($('#clueEntry'));
	let spinner = $('#guessEntry').spinner({
		min: 0,
		max: 25,
	});
	spinner.css('width', '90%');

	uiGetModeDialog = $('<div title="Begin Game?">What would you like to do?</div>');
	uiGetModeDialog.dialog(
    {
        dialogClass: "no-close",
        modal: true,
        buttons: 
        [
            {
                text: 'Begin a new game',
                click: function() 
                {
                    uiGetModeDialog.resolve(MODE_HOST);
                    $(this).dialog("close");
                },
            },
            {
                text: 'Join an existing game',
                click: function() 
                {
                    uiGetModeDialog.resolve(MODE_CLIENT);
                    $(this).dialog("close");
                },
            },
        ],
        closeOnEscape: false,
        autoOpen: false,
    });
	uiGetModeDialog.parent().find('.ui-dialog-titlebar-close').css('display', 'none');

	uiGetPlayersDialog = $('<div title="Players"><br>' +
        		'<table width="100%" id="users" class="ui-widget ui-widget-content">' +
        			'<thead>' +
        				'<tr class="ui-widget-header ">' +
        					'<th>Name</th>' +
        					'<th>Team</th>' +
        					'<th>Role</th>' +
        				'</tr>' +
        			'</thead>' +
        			'<tbody>' +
        			'</tbody>' +
        		'</table>' +
        	'</div>');
	uiGetPlayersDialog.dialog(
    {
        modal: true,
        buttons: 
        [
            {
                text: 'OK',
                click: function() {
                    setPlayerRoles(function(idx)
                    {
                        let listItem = $('#users > tbody');
                        let role = {};
                        role.team = listItem.find('.teamCell').slice(idx, idx+1).text() == "Red" ? RED : BLUE;
                        role.spymaster = listItem.find('.roleCell').slice(idx, idx+1).text() == "Spymaster";
                        return role;
                        
                    });
                    $(this).dialog("close");
                    uiGetPlayersDialog.resolve();
                },
            },
        ],
        closeOnEscape: false,
        autoOpen: false,
    });
	uiGetPlayersDialog.parent().find('.ui-dialog-titlebar-close').css('display', 'none');

	uiAlertDialog = $('<div></div>');
	uiAlertDialog.dialog(
    {
        modal: true,
        buttons: [{
            text: 'OK',
            click: function() {
                $(this).dialog("close");
            },
        }],
        autoOpen: false,
    });
}

function uiShowWinner(winner)
{
    if(winner == playerTeam)
    {
        uiAlert('Game Over', "Your team has won!");
    }
    else
    {
        uiAlert('Game Over', "Your team has lost!");
    }
}

function uiCardClicked(event)
{
	if(uiState == UISTATE_GUESS)
	{
		let word = $(event.target).text();
		gmTriggerEvent(SEND_GUESS, word);
	}
}

function uiMenuClicked(event)
{
    if(mode == MODE_HOST)
    {
        uiConnectPlayers().then(() =>
        gmStartGame());
    }
}

function uiGetPlayerName()
{
    return new Promise(function(resolve, reject) 
    {
    	uiGetNameDialog.dialog('open');
    	uiGetNameDialog.resolve = resolve;
    	uiGetNameDialog.reject = reject;
    });
}

function uiActionButtonClicked()
{
    if(uiState == UISTATE_GUESS)
    {
        uiPass();
    }
    else if(uiState == UISTATE_CLUE)
    {
        uiGetClue();
    }
}

function uiGetClue()
{
   	uiGetClueDialog.dialog('open');
}

function styleTextBox(input)
{
/*    
    input.button().css({
    	'font': 'inherit',
    	'color': 'inherit',
    	'text-align': 'left',
    	'outline': 'none',
    	'cursor': 'text',
    	'background-image' : 'none',
    	'background-color' : 'black',
    	'overflow' : 'hidden',
    	'width' : '90%',
    });
*/    
}

function uiGetGameMode()
{
    return new Promise(function(resolve, reject) 
    {
    	uiGetModeDialog.resolve = resolve;
    	uiGetModeDialog.reject = reject;
        uiGetModeDialog.dialog('open');
        uiGetModeDialog.parent().focus();
    });
}

function uiAddPlayer(name, team, spymaster)
{
    let cells = $('#users > tbody');
    cells.append(	'<tr class="playerRow">' +
                               		'<td>' + name + '</td>' +
                                	'<td class="teamCell">' + (team == RED ? 'Red' : 'Blue') + '</td>' +
                                	'<td class="roleCell">' + (spymaster ? 'Spymaster' : 'Agent') + '</td>' +
                            	'</tr>');
    cells.css('cursor', 'default');
    $('.teamCell').unbind('click');
    $('.teamCell').click(uiToggleTeam);
    $('.teamCell').css('cursor', 'pointer');
    $('.roleCell').unbind('click');
    $('.roleCell').click(uiToggleRole);   
    $('.roleCell').css('cursor', 'pointer');

}

function uiToggleRole(event)
{
    let cell = $(event.target);
    if(cell.text() == 'Agent')
    {
        cell.text('Spymaster');
    }
    else
    {
        cell.text('Agent');
    }
    // TODO - make sure there is only one master per team
}

function uiToggleTeam(event)
{
    let cell = $(event.target);

    if(cell.text() == 'Red')
    {
        cell.text('Blue');
    }
    else
    {
        cell.text('Red');
    }
    // TODO - make sure there is only one master per team
}

function uiConnectPlayers()
{
    return new Promise(function(resolve, reject) 
    {
    	uiGetPlayersDialog.resolve = resolve;
    	uiGetPlayersDialog.reject = reject;
        uiGetPlayersDialog.dialog('open');
        uiGetPlayersDialog.parent().focus();
    });

}

function uiWaitForGameStart()
{
    return new Promise(function(resolve, reject) 
    {
        let diag = $('<div id="waitingDialog">Waiting for the host to start the game...</div>').dialog(
        {
            modal: true,
            close: function(event, ui)
            {
                resolve();
                $(this).dialog("destroy").remove();
            },
            closeOnEscape: false,
            autoOpen: false,
        });
		diag.parent().find('.ui-dialog-titlebar').css('display', 'none');
    	diag.dialog('open');
    });
}

function uiAnnounceRole(team, master)
{
    $('#roleText').html(centerText + ((team == RED) ? 'Red' : 'Blue') + ' ' + (master ? 'Spymaster' : 'Agent'));

	if(mode == MODE_CLIENT)
	{
    	uiDismissWaitForGameStart();
        let text = 'You are playing as ' + (master ? 'the spymaster' : 'an agent') + ' for the ' + ((team == RED) ? 'red' : 'blue') + ' team.';
    	uiAlert('Let\'s Begin!', text);
    }
}
                
function uiRefreshBoardState(board, turn)
{
    redRemain = 0;
    blueRemain = 0;

    for(let row = 0; row < 5; row++)
    {
        for(let col = 0; col < 5; col++)
        {
            let card = board[(row * 5) + col];
            let cardui = $('.card.card-row-' + row + '.card-col-' + col);
            cardui.html(centerText + card.word);
            cardui.removeClass();
            cardui.addClass('card');
            cardui.addClass('card-row-' + row);
            cardui.addClass('card-col-' + col);

            if(gameOver)
            {
                cardui.addClass('shown');
                switch(card.color)
                {
                    case RED: cardui.addClass('color-red'); break;
                    case BLUE: cardui.addClass('color-blue'); break;
                    case BROWN: cardui.addClass('color-brown'); break;
                    case BLACK: cardui.addClass('color-black'); break;
                }
            }
            else if(playerSpymaster)
            {
                cardui.addClass(card.shown ? 'shown' : 'hidden');
                switch(card.color)
                {
                    case RED: cardui.addClass('color-red'); break;
                    case BLUE: cardui.addClass('color-blue'); break;
                    case BROWN: cardui.addClass('color-brown'); break;
                    case BLACK: cardui.addClass('color-black'); break;
                }
            }
            else if(card.shown)
            {
                cardui.addClass('shown');
                cardui.addClass('color-brown');
            }
            else
            {
                cardui.addClass('hidden');
                switch(card.color)
                {
                    case RED: cardui.addClass('color-red'); break;
                    case BLUE: cardui.addClass('color-blue'); break;
                    case BROWN: cardui.addClass('color-brown'); break;
                    case BLACK: cardui.addClass('color-black'); break;
                }
            }

            if(card.shown)
            {
                if(card.color == RED)
                {
                    redRemain++;
                }
                else if(card.color == BLUE)
                {
                    blueRemain++;
                }
            }
        }
    }

    $('#action').hide();

    if(gameOver)
    {
        $('#redRemain').text('0');
        $('#blueRemain').text('0');

        $('#guesses').html(centerText + 'Guesses Remaining: --');
        $('#clueText').html(centerText + '--');

        if(MODE_HOST)
        {
            $('#instructions').html(centerText + 'Game over.');
        }
        else
        {
            $('#instructions').html(centerText + 'Game over.  Wait for the host to start another.');
        }
        uiBlockInput();
    }
    else
    {
        $('#redRemain').html(centerText + redRemain);
        $('#blueRemain').html(centerText + blueRemain);

       	$('#guesses').html(centerText + 'Guesses Remaining: ' + turn.guesses);
       	$('#clueText').html(centerText + turn.clue);

        if(turn.team != playerTeam)
        {
            $('#instructions').html(centerText + 'It is the ' + ((turn.team == RED) ? 'red' : 'blue') + ' team\'s turn.  Please wait.');
            uiBlockInput();
        }
        else if(turn.state == STATE_CLUE)
        {
            if(playerSpymaster)
            {
                $('#instructions').html(centerText + 'Your turn. Time to give your clue.');
                uiWaitForClue();
            }
            else
            {
                $('#instructions').html(centerText + 'Your turn. Wait for the spymaster to provide a clue.');
                uiBlockInput();
            }
        }
        else if(turn.state == STATE_GUESS)
        {
            if(playerSpymaster)
            {
                $('#instructions').html(centerText + 'Your turn. Your agents are working on your clue.');
                uiBlockInput();
            }
            else
            {
                $('#instructions').html(centerText + 'You have up to ' + turn.guesses + ' guesses. Select the word you think matches your spymaster\'s clue.');
                uiWaitForGuess();
            }
        }
    }
}

function uiShowClue(team, word, num)
{	
	if(team == playerTeam)
	{
		if(!playerSpymaster)
		{
    		uiAlert('Clue', 'Your clue: ' + word + ', ' + num);
    	}
	}
	else
	{
    	uiAlert('Clue', (team == RED ? 'Red' : 'Blue') + '\'s clue: ' + word + ', ' + num);
	}
}

function uiFindCard(word)
{
	return $('.card:contains("' + word + '")');
}

function uiShowGuess(team, data)
{
    /* nothing to do - handled by css */
}

function uiDismissWaitForGameStart()
{
    $('#waitingDialog').dialog('close');
}

function uiSetRole(team, master)
{
    $('#roleText').html(centerText + ((team == RED) ? 'Red' : 'Blue') + ' ' + (master ? 'Spymaster' : 'Agent'));
}

function uiWaitForClue()
{
    uiState = UISTATE_CLUE;
    $('#action').text('Send Your Clue');
    $('#action').show();
}

function uiWaitForGuess()
{
    uiState = UISTATE_GUESS;
    $('#action').text('Pass');
    $('#action').show();
}

function uiPass()
{
    gmTriggerEvent(SEND_PASS, null);
}

function uiShowPass()
{
}

function uiBlockInput()
{
    uiState = UISTATE_NO_INPUT;
}

function uiAlert(title, msg)
{
	uiAlertDialog.dialog('option', 'title', title);
	uiAlertDialog.text(msg);
	uiAlertDialog.dialog('open');
}

const SET_NAME          = 0;
const SET_ROLE          = 1;
const SET_BOARD         = 2;
const SEND_CLUE         = 3;
const SEND_GUESS        = 4;
const SEND_PASS         = 5;
const GAME_OVER         = 6;

const CMD_STR = ['setname', 'setrole', 'setboard', 'sendclue', 'sendguess', 'sendpass', 'gameover'];

const STATE_CLUE        = 0;
const STATE_GUESS       = 1;

function gmStartGame()
{
	if(mode == MODE_HOST)
	{
        foundAssassin = BLACK;
        gameOver = false;
	    gmCreateBoard();
	    gmSetRoles();
	    gmTriggerEvent(SET_BOARD, {cards: boardState, turn: currentTurn});
	}
}


function gmFindCard(word)
{
	for(let i = 0; i < boardState.length; i++)
	{
		if(boardState[i].word == word)
		{
			return boardState[i];
		}
	}
	return null;
}

function gmHandlePass(word)
{
    currentTurn.guesses = '--';
    currentTurn.clue = '--';
    currentTurn.team = (currentTurn.team == RED) ? BLUE : RED;
    currentTurn.state = STATE_CLUE;
}

function gmHandleGuess(word)
{
    let card = gmFindCard(word);
    if(card.shown)
    {
	    currentTurn.guesses--;
	    let card = gmFindCard(word);
	    card.shown = false;
	    if(card.color == BLACK)
	    {
            foundAssassin = currentTurn.team;
            return true;
	    }
	    else if(currentTurn.guesses == 0 || card.color != currentTurn.team)
	    {
            currentTurn.guesses = '--';
            currentTurn.clue = '--';
	        currentTurn.team = (currentTurn.team == RED) ? BLUE : RED;
	        currentTurn.state = STATE_CLUE;
	    }
	    
	    return true;
	}
	return false;
    
}

function gmSetRoles()
{
	uiAnnounceRole(playerTeam, playerSpymaster);
    for(let i = 0; i < players.length; i++)
    {
    	console.log('TX: ' + CMD_STR[SET_ROLE] + ' to ' + i);
        players[i].channel.send({cmd: SET_ROLE, data: {
            role: players[i].spymaster,
            team: players[i].team,
        }});
    }
}

function gmCreateBoard()
{
    let firstTeam = rand(2) ? RED : BLUE;
    let secondTeam = (firstTeam == RED) ? BLUE : RED;

    currentTurn = {team: firstTeam, state: STATE_CLUE, guesses: '--', clue: '--'};

    boardState = [];

    shuffle(WORD_BANK);

    // Set words for first team.
    for(let i = 0; i < 9; i++)
    {
        let word = {
            word: WORD_BANK[i][rand(2)],
            shown: true,
            color: firstTeam,
        };
        boardState.push(word);
    }

    // Set words for second team.
    for(let i = 9; i < 17; i++)
    {
        let word = {
            word: WORD_BANK[i + 9][rand(2)],
            shown: true,
            color: secondTeam
        };
        boardState.push(word);
    }

    // Set words for bystanders.
    for(let i = 17; i < 24; i++)
    {
        let word = {
            word: WORD_BANK[i + 17][rand(2)],
            shown: true,
            color: BROWN
        };
        boardState.push(word);
    }

    // Set assasin word
    let word = {
        word: WORD_BANK[24][rand(2)],
        shown: true,
        color: BLACK
    };
    boardState.push(word);

    // Scramble the word list
    shuffle(boardState);
}

function gmTriggerEvent(cmd, data)
{
    if(mode == MODE_HOST)
    {
        gmHandleEvent(cmd, data);
    }
    else
    {
        gmPassEventToHost(cmd, data);
    }
}

function gmPassEventToHost(cmd, data)
{
   	console.log('TX: ' + CMD_STR[cmd]);
    players[0].channel.send({cmd: cmd, data: data});
}

function gmSendToClients(cmd, data)
{
    for(let i = 0; i < players.length; i++)
    {
    	console.log('TX: ' + CMD_STR[cmd] + ' to ' + i);
        players[i].channel.send({cmd: cmd, data: data});
    }
}

function gmHandleEvent(cmd, data)
{
    if(mode == MODE_HOST)
    {
        switch(cmd)
        {
            case SET_NAME:
            {
                uiAddPlayer(data, RED, false);
                break;   
            }
            case SET_ROLE:
            {
                // Nothing to do for host.
                break;   
            }
            case SET_BOARD:
            {
            	uiRefreshBoardState(boardState, currentTurn);
                gmSendToClients(cmd, data);
                break;
            }
            case SEND_CLUE:
            {
            	currentTurn.guesses = parseInt(data.num) + 1;
            	currentTurn.clue = data.clue;
            	currentTurn.state = STATE_GUESS;
            	data.team = currentTurn.team;
            	uiShowClue(currentTurn.team, data.clue, data.num);
            	gmSendToClients(cmd, data);
            	uiRefreshBoardState(boardState, currentTurn);
            	gmSendToClients(SET_BOARD, {cards: boardState, turn: currentTurn});
            	break;
            }
            case SEND_GUESS:
            {
            	if(gmHandleGuess(data))
            	{
            		uiShowGuess(data);
            		gmSendToClients(cmd, data);
            		uiRefreshBoardState(boardState, currentTurn);
            		gmSendToClients(SET_BOARD, {cards: boardState, turn: currentTurn});
                    let winner = gmCheckWinner();
                    if(winner == RED || winner == BLUE)
                    {
                        gmTriggerEvent(GAME_OVER, winner);
                    }
            	}
            	break;
            }
            case SEND_PASS:
            {
                gmSendToClients(cmd, data);
                gmHandlePass();
                uiRefreshBoardState(boardState, currentTurn);
                gmSendToClients(SET_BOARD, {cards: boardState, turn: currentTurn});
                break;
            }
            case GAME_OVER:
            {
                gameOver = true;
                uiShowWinner(data);
                gmSendToClients(cmd, data);
                uiRefreshBoardState(boardState, currentTurn);
                gmSendToClients(SET_BOARD, {cards: boardState, turn: currentTurn});
                break;
            }
        }
    }
    else
    {
        switch(cmd)
        {
            case SET_NAME:
            {
                // Nothing to do for client.
                break;   
            }
            case SET_ROLE:
            {
                playerTeam = data.team;
                playerSpymaster = data.role;
                gameOver = false;
                uiAnnounceRole(playerTeam, playerSpymaster);
                break;   
            }
            case SET_BOARD:
            {
                uiRefreshBoardState(data.cards, data.turn);
                break;
            }
            case SEND_CLUE:
            {
            	uiShowClue(data.team, data.clue, data.num);
            	break;
            }
            case SEND_GUESS:
            {
            	uiShowGuess(data);
           		break;
            }
            case SEND_PASS:
            {
                uiShowPass();
                break;
            }
            case GAME_OVER:
            {
                gameOver = true;
                uiShowWinner(data);
                break;
            }
        }
    }
}

function gmCheckWinner()
{
    if(foundAssassin == RED)
    {
        return BLUE;
    }

    if(foundAssassin == BLUE)
    {
        return RED;
    }

    if(redRemain == 0)
    {
        return RED;
    }

    if(blueRemain == 0)
    {
        return BLUE;
    }

    return BLACK;
}





var WORD_BANK = [
['THUMB','ANTARCTICA'],
['POINT','TUBE'],
['STATE','TORCH'],
['KNIGHT','PIE'],
['MAMMOTH','COMIC'],
['FILE','BAR'],
['CLIFF','LAB'],
['LUCK','AMAZON'],
['COLD','CRICKET'],
['HAND','SWING'],
['LEMON','BELL'],
['SCHOOL','SERVER'],
['CHICK','CENTER'],
['CROWN','HIMALAYAS'],
['NURSE','LEPRECHAUN'],
['WIND','KID'],
['PUMPKIN','TEACHER'],
['MOSCOW','PALM'],
['MILLIONAIRE','DAY'],
['LIGHT','BELT'],
['ROBOT','EMBASSY'],
['CASINO','PILOT'],
['BLOCK','FRANCE'],
['BEAT','HOLE'],
['QUEEN','CHECK'],
['ROW','PISTOL'],
['TRIANGLE','CAP'],
['BOMB','RULER'],
['DRILL','DATE'],
['JUPITER','SHARK'],
['BEAR','GLASS'],
['GRACE','OLIVE'],
['CAR','WAVE'],
['COURT','SPRING'],
['EGYPT','THEATER'],
['ROULETTE','MERCURY'],
['BUG','MINT'],
['CARD','HORN'],
['HOOD','HEART'],
['PARACHUTE','HOTEL'],
['DEGREE','BOW'],
['ROUND','INDIA'],
['KEY','ALIEN'],
['PLASTIC','DWARF'],
['ICE','TAG'],
['YARD','CHEST'],
['CODE','KIWI'],
['NOTE','GROUND'],
['SPIKE','SCIENTIST'],
['DUCK','RING'],
['BAND','FIRE'],
['ROBIN','BRIDGE'],
['PASTE','MISSILE'],
['PANTS','WALL'],
['PIPE','NOVEL'],
['FORK','GERMANY'],
['WEB','FAN'],
['SCREEN','FAIR'],
['PLAY','TOOTH'],
['PASS','GREEN'],
['SPY','UNICORN'],
['HELICOPTER','SNOWMAN'],
['MINE','TURKEY'],
['CRANE','TRIP'],
['GENIUS','EAGLE'],
['CROSS','SEAL'],
['DIAMOND','WHALE'],
['MAPLE','AZTEC'],
['MOUSE','WAR'],
['PLATE','LINE'],
['SUIT','CHOCOLATE'],
['HORSESHOE','HONEY'],
['BOOM','BANK'],
['CALF','AIR'],
['MICROSCOPE','JET'],
['MEXICO','EYE'],
['MOLE','SHOE'],
['TABLE','TIE'],
['BOOT','GHOST'],
['DRESS','AMBULANCE'],
['KING','PITCH'],
['FOOT','NEW YORK'],
['CELL','COVER'],
['BOLT','CHINA'],
['ROCK','LONDON'],
['MUG','CONCERT'],
['POUND','SUB'],
['SPOT','PIANO'],
['OLYMPUS','NINJA'],
['RAY','POST'],
['PIN','WASHINGTON'],
['POOL','STAR'],
['BERLIN','FACE'],
['HORSE','PIRATE'],
['GAS','CAST'],
['DINOSAUR','BILL'],
['WITCH','KETCHUP'],
['CONDUCTOR','DOG'],
['TELESCOPE','CYCLE'],
['LOG','LOCH NESS'],
['DANCE','LINK'],
['MOUTH','TAP'],
['UNDERTAKER','MAIL'],
['SUPERHERO','OIL'],
['SLUG','COMPOUND'],
['MOUNT','BOX'],
['PARK','FIGURE'],
['NIGHT','STRING'],
['AFRICA','SCUBA DIVER'],
['GLOVE','STREAM'],
['STICK','PLATYPUS'],
['PAPER','SOUND'],
['WATER','CHAIR'],
['THIEF','BARK'],
['PLOT','PUPIL'],
['HAWK','BATTERY'],
['LOCK','BRUSH'],
['KNIFE','CHURCH'],
['BAT','MASS'],
['AMERICA','IVORY'],
['VAN','VET'],
['GIANT','NAIL'],
['ROSE','CHANGE'],
['DRAFT','HAM'],
['PRESS','SPINE'],
['BACK','CZECH'],
['SHOP','NEEDLE'],
['SHOT','CAT'],
['ENGLAND','SMUGGLER'],
['SATURN','HOSPITAL'],
['OCTOPUS','WHIP'],
['WORM','ALPS'],
['SPIDER','ANGEL'],
['SOCK','NUT'],
['LIFE','LAP'],
['LEAD','WATCH'],
['CLOAK','BOARD'],
['BUCK','AGENT'],
['ATLANTIS','VACUUM'],
['OPERA','PYRAMID'],
['LION','POLICE'],
['WELL','HOLLYWOOD'],
['SHIP','DICE'],
['DEATH','STOCK'],
['DISEASE','PORT'],
['JAM','ORGAN'],
['CAPITAL','FENCE'],
['DRAGON','STADIUM'],
['PENGUIN','ROOT'],
['AUSTRALIA','LIMOUSINE'],
['SHAKESPEARE','ENGINE'],
['RACKET','BEIJING'],
['BALL','DOCTOR'],
['DROP','PHOENIX'],
['ORANGE','TEMPLE'],
['TIME','PRINCESS'],
['STAFF','MARBLE'],
['LASER','SKYSCRAPER'],
['TAIL','CRASH'],
['MOON','NET'],
['SINK','CLUB'],
['TABLET','SLIP'],
['GREECE','SQUARE'],
['DECK','BUFFALO'],
['HEAD','LITTER'],
['KANGAROO','STRIKE'],
['COPPER','JACK'],
['APPLE','POLE'],
['BEACH','CHARGE'],
['CANADA','SCORPION'],
['CENTAUR','SHADOW'],
['MATCH','IRON'],
['ARM','BERMUDA'],
['FIELD','TRAIN'],
['ICE CREAM','RABBIT'],
['SPACE','HOOK'],
['MARCH','CONTRACT'],
['TRUNK','SNOW'],
['TOKYO','MODEL'],
['SOUL','EUROPE'],
['FISH','COTTON'],
['CARROT','FLUTE'],
['REVOLUTION','COOK'],
['TICK','GOLD'],
['BUTTON','FILM'],
['FLY','PIT'],
['TOWER','POISON'],
['LAWYER','SATELLITE'],
['FOREST','BOTTLE'],
['TRACK','FORCE'],
['GRASS','SPELL'],
['FIGHTER','WAKE'],
['STRAW','SWITCH'],
['SCALE','FALL'],
['PART','BUGLE'],
['BED','CIRCLE'],
['GAME','WASHER'],
['PAN','BOND'],
['PLANE','ROME'],
['SOLDIER','BERRY']
];