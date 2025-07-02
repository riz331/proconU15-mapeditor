
let mapData = [];
let currentType = 0;
let isDragging = false;
let playerPositions = { C: null, H: null };

// --- Socket.IO イベントリスナー設定関数 ---
function setupSocketListeners() {
    if (!socket) return; // socketがなければ何もしない

    // 既存のリスナーがあれば削除 (重複設定を防ぐ)
    socket.off('map_created');
    
    socket.on('map_created', (data) => {
        
         alert(`マップ作成結果: ${data.status}`);
         const uploadButton = document.getElementById('upload-button');
         
    });

}




function createPalette() {
    const palette = document.getElementById('palette');
    const types = [
        { type: 0, color: '#ffffff', image: null },
        { type: 1, color: '#000000', image: 'image/wall.png' },
        { type: 2, color: '#ff69b4', image: 'image/hart.png' },
        { type: 3, color: '#ffffff', image: 'image/cool.png' },
        { type: 4, color: '#ffffff', image: 'image/hot.png' }
    ];

    types.forEach(({ type, color, image }) => {
        const paletteItem = document.createElement('div');
        paletteItem.className = 'palette-color';
        paletteItem.dataset.type = type;
        if (image) {
            paletteItem.style.backgroundImage = `url(${image})`;
            paletteItem.style.backgroundSize = 'cover';
        } else {
            paletteItem.style.backgroundColor = color;
        }
        paletteItem.addEventListener('click', () => {
            currentType = type;
            document.querySelectorAll('.palette-color').forEach(item => item.classList.remove('selected'));
            paletteItem.classList.add('selected');
        });
        palette.appendChild(paletteItem);
    });
    document.querySelector('.palette-color').classList.add('selected'); // 初期選択
}

function createMap(x, y) {
    const mapContainer = document.getElementById('map-container');
    mapContainer.innerHTML = '';
    mapContainer.style.gridTemplateColumns = `repeat(${x}, 20px)`;
    mapData = Array.from({ length: y }, () => Array(x).fill(0));

    for (let i = 0; i < y; i++) {
        for (let j = 0; j < x; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.type = '0';
            cell.addEventListener('mousedown', () => {
                isDragging = true;
                setCellType(cell, i, j);
            });
            cell.addEventListener('mouseover', () => {
                if (isDragging && currentType < 3) { // プレイヤー以外のタイプのみドラッグで配置
                    setCellType(cell, i, j);
                }
            });
            cell.addEventListener('mouseup', () => {
                isDragging = false;
            });
            cell.addEventListener('click', () => {
                if (currentType >= 3) { // プレイヤータイプのみクリックで配置
                    setPlayerType(cell, i, j);
                }
            });
            mapContainer.appendChild(cell);
        }
    }
}

function setCellType(cell, i, j) {
    cell.dataset.type = currentType;
    mapData[i][j] = currentType;
    const types = [
        { type: 0, color: '#ffffff', image: null },
        { type: 1, color: '#000000', image: 'image/wall.png' },
        { type: 2, color: '#ff69b4', image: 'image/hart.png' },
        { type: 3, color: '#ffffff', image: 'image/cool.png' },
        { type: 4, color: '#ffffff', image: 'image/hot.png' }
    ];
    const { color, image } = types[currentType];
    if (image) {
        cell.style.backgroundImage = `url(${image})`;
        cell.style.backgroundSize = 'cover';
    } else {
        cell.style.backgroundColor = color;
        cell.style.backgroundImage = '';
    }
}

function setPlayerType(cell, i, j) {
    const playerType = currentType === 3 ? 'C' : 'H';
    if (playerPositions[playerType]) {
        const [prevI, prevJ] = playerPositions[playerType];
        const prevCell = document.querySelector(`#map-container .cell:nth-child(${prevI * mapData[0].length + prevJ + 1})`);
        prevCell.dataset.type = '0';
        prevCell.style.backgroundColor = '#ffffff';
        prevCell.style.backgroundImage = '';
        mapData[prevI][prevJ] = 0;
    }
    playerPositions[playerType] = [i, j];
    setCellType(cell, i, j);
}

document.addEventListener('mouseup', () => {
    isDragging = false;
});

document.getElementById('map-size-x').addEventListener('change', (e) => {
    const x = parseInt(e.target.value);
    const y = parseInt(document.getElementById('map-size-y').value);
    createMap(x, y);
});

document.getElementById('map-size-y').addEventListener('change', (e) => {
    const y = parseInt(e.target.value);
    const x = parseInt(document.getElementById('map-size-x').value);
    createMap(x, y);
});


///////////////////////////////////////////////////////
//save処理  ///////////////////////////////////////
///////////////////////////////////////////////////////
document.getElementById('save-button').addEventListener('click', () => {
    mapDataJSON = updateMapDataJSON();
    console.log(mapDataJSON);

    //以降ダウンロード処理
    const jsonString = JSON.stringify(mapDataJSON, null, "\t"); 
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapDataJSON.name || 'map'}.json`;
    a.click();
    URL.revokeObjectURL(url);
});


//JSONデータの更新
function updateMapDataJSON() {

    //0. マップデータの生成
    let mapDataJSON={};


    //1.必須情報の取得
    const roomName = document.getElementById('room-name').value;
    const roomId = document.getElementById('room-name').value;//document.getElementById('room-id').value;
    const turnCount = document.getElementById('turn-count').value;

    const CoolInfo={
        "status":false,
        "turn":false
    }
    const HotInfo={
        "status":false,
        "turn":false
    }




    //1.1.マップ名とIDが空ではないことを確認
    if (!roomName || !roomId) {
        alert('マップ名とIDを入力してください。');
        return;
    }

    mapDataJSON.name=roomName;
    mapDataJSON.room_id=roomId;//あとで先頭を変更させる
    
    



    //2.マップデータの取得
    //マップが手動の場合、CとHがリスト内に存在していることを確認
    const MapGenerateType =document.getElementById("map-generation-toggle").value;

    //手動マップの場合、CとHの位置を取得してJSONに格納
    if (MapGenerateType === "manual") {
        const playerCCount = mapData.flat().filter(type => type === 3).length;
        const playerHCount = mapData.flat().filter(type => type === 4).length;

        //ドラッグ位置などのバグで複数のCやHが配置されている場合、アラートを表示して処理を中断
        if(playerCCount>1){
            alert('Cが複数配置されています。');
            return;
        }
        if(playerHCount>1){
            alert('Hが複数配置されています。');
            return;
        }

        const playerCExists = playerCCount > 0;
        const playerHExists = playerHCount > 0;


        // CとHが存在しない場合、アラートを表示して処理を中断
        if ((!playerCExists || !playerHExists)) {
            alert('[マップ生成手法"手動マップ"]の場合、CとHを配置してください。');
            return;
        }
        else{
            //Coolの位置を取得
            for(let i=0;i<mapData.length;i++){
                for(let j=0;j<mapData[0].length;j++){
                    if(mapData[i][j]==3){
                        CoolInfo.x=j;
                        CoolInfo.y=i;
                    }
                }
            }
            //Hotの位置を取得
            for(let i=0;i<mapData.length;i++){
                for(let j=0;j<mapData[0].length;j++){
                    if(mapData[i][j]==4){
                        HotInfo.x=j;
                        HotInfo.y=i;
                    }
                }
            }
        
            mapDataJSON.map_size_x=mapData[0].length;
            mapDataJSON.map_size_y=mapData.length;
            mapDataJSON.map_data=mapData;
            
        }
    }
    //自動生成の場合，各パラメータを取得してJSONに格納
    else{
        mapDataJSON.map_size_x = parseInt(document.getElementById("map-size-x").value);
        mapDataJSON.map_size_y = parseInt(document.getElementById("map-size-y").value);
        mapDataJSON.map_data=[];
        mapDataJSON.auto_block = parseInt(document.getElementById("auto-block").value);
        mapDataJSON.auto_point = parseInt(document.getElementById("auto-point").value);
        mapDataJSON.auto_symmetry=document.getElementById("auto-obstacle").checked;
    }

    
    //cool hot,turnの追加
    mapDataJSON.cool=CoolInfo;
    mapDataJSON.hot=HotInfo;
    mapDataJSON.turn = parseInt(turnCount, 10);



    //3.CPU処理
    //cpuとの対戦かどうか
    const isCpuBattle = document.getElementById('cpu-toggle').checked ? mapDataJSON.cpu = {} : null;
    

    //room idの編集 vs or pvt
    if(isCpuBattle){
        
        //mapDataJSON.room_id="pvt_"+roomId;//サーバ側でonetime_room付けるからいらない
        console.log("cpu対戦",mapDataJSON.room_id);
        const cpuLevel = document.getElementById('cpu-level').value;
        const cpuTurn = document.getElementById('cpu-turn').value;
        
        mapDataJSON.cpu.level = cpuLevel;//cpuのレベル        
        mapDataJSON.cpu.turn = cpuTurn;//hot or cool　





        //level2のオプション判定
        const cpuAdvancedOption = document.getElementById('cpu-advanced-option').checked ? mapDataJSON.cpu.advanced_option = {} : null;        
        
        if(cpuLevel==2 && cpuAdvancedOption){
            //CPUのレベルが2かつ詳細オプションがONの場合、詳細オプションをJSONに格納
            const hotokeCount=document.getElementById('cpu-toggle-hotoke').checked 
                ? document.getElementById('cpu-option-hotoke').value: null;//見逃し回数
            const itemCount=document.getElementById('cpu-toggle-item').checked
                ? document.getElementById('cpu-option-item').value:null;//アイテム使用回数
            const nanameFlag=document.getElementById('cpu-toggle-naname').checked;//斜め移動の有無
            
            cpu_option_list = [];//詳細オプションのリスト
            if(hotokeCount!=null){
                cpu_option_list.push("hotoke="+hotokeCount);
            }
            if(itemCount!=null){
                cpu_option_list.push("item="+itemCount);
            }
            if(nanameFlag){
                cpu_option_list.push("naname=1");
            }else
            {
                cpu_option_list.push("naname=0");
            }
            //listを&で結合してstringに
            mapDataJSON.cpu.level = cpuLevel+"?"+cpu_option_list.join('&');

            console.log("cpuの詳細オプション",mapDataJSON.cpu.level);
        }
    
    }
    // else
    // {
    //     //CPU対戦でない場合、room_idをvs+roomIdに変更
    //     //mapDataJSON.room_id="vs_"+roomId;//サーバ側でonetime_room付けるからいらない
    //     // console.log("cpu対戦",mapDataJSON.room_id);
    // }
    return mapDataJSON;
}



//////////////////////////////////
//表示/非表示の処理
//////////////////////////////////

// CPUのレベルが２の場合のみ，詳細オプションを表示
document.getElementById('cpu-level').addEventListener('change', function() {
    const cpuDetailOptions = document.getElementById('cpu-detail-options');
    if (this.value === '2') {
        cpuDetailOptions.style.display = 'block';
    } else {
        cpuDetailOptions.style.display = 'none';
    }
});
//CPUのレベルが２の場合かつ，詳細オプションがONの場合のみ設定項目表示
document.getElementById('cpu-advanced-option').addEventListener('change', function() {
    const advancedOptionFlag= document.getElementById('cpu-advanced-option').checked;
    if(advancedOptionFlag){
        document.getElementById('cpu-detail-options2').style.display = 'block';
    }
    else{
        document.getElementById('cpu-detail-options2').style.display = 'none';
    }
});

document.getElementById('cpu-toggle-hotoke').addEventListener('change', function() {
    const hotokeFlag= document.getElementById('cpu-toggle-hotoke').checked;
    if (hotokeFlag) {
        document.getElementById('cpu-option-hotoke').disabled = false;
    } else {
        document.getElementById('cpu-option-hotoke').disabled = true;
    }
});

document.getElementById('cpu-toggle-item').addEventListener('change', function() {
    const hotokeFlag= document.getElementById('cpu-toggle-item').checked;
    if (hotokeFlag) {
        document.getElementById('cpu-option-item').disabled = false;
    } else {
        document.getElementById('cpu-option-item').disabled = true;
    }
});



document.getElementById('cpu-toggle').addEventListener('change', function() {
    const cpuOptions = document.getElementById('cpu-options');
    cpuOptions.style.display = this.checked ? 'block' : 'none';
});
document.getElementById('cpu-toggle').dispatchEvent(new Event('change'));

document.getElementById('map-generation-toggle').addEventListener('change', function() {
    const mapContainer = document.getElementById('map-container');
    const palette = document.getElementById('palette');
    const randomOptions = document.getElementById('random-options');
    if (this.value === 'random') {
        mapContainer.style.display = 'none';
        palette.style.display = 'none';
        randomOptions.style.display = 'block';
    } else {
        mapContainer.style.display = 'grid';
        palette.style.display = 'flex';
        randomOptions.style.display = 'none';
    }
});




/////////////////////////////////////////////
// ヘルプ表示処理//////////////////////////////
/////////////////////////////////////////////
const dynamicHelp = document.getElementById('dynamic-help');
const helpText = document.getElementById('help-text');

// ヘルプ内容を定義
let helpMessages = {};

// help_text.jsonを読み込む
fetch('help_text.json')
    .then(response => response.json())
    .then(data => {
        helpMessages = data;
    })
    .catch(error => {
        console.error('Failed to load help_text.json:', error);
    });

// マウスオーバー時にヘルプを表示
document.addEventListener('mouseover', (event) => {
    const target = event.target;
    const helpId = target.dataset.helpId; // data-help-id属性を取得

    if (helpId && helpMessages[helpId]) {
        helpText.innerHTML = helpMessages[helpId].replace(/\n/g, '<br>');
        dynamicHelp.style.display = 'block';
        dynamicHelp.style.top = `${event.pageY + 10}px`;
        dynamicHelp.style.left = `${event.pageX + 10}px`;
    } else {
        dynamicHelp.style.display = 'none';
    }
});

// マウスが離れたらヘルプを非表示
document.addEventListener('mouseout', () => {
    dynamicHelp.style.display = 'none';
});

document.getElementById('setting-load-button').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    updateFormFieldsFromJSON(e.target.result);

                } catch (error) {
                    alert('JSONファイルの読み込みに失敗しました。'+error);
                }
            };
            reader.readAsText(file);
        }
    });

    input.click();
});

document.getElementById('upload-button').addEventListener('click', () => {
    //1. フォームから情報取得
    const serverUrl = document.getElementById('upload-url').value;
    const uploadKey = document.getElementById('upload-password').value;

    if (!serverUrl || !uploadKey) {
        alert('入力項目エラー: サーバーURLとパスワードを入力してください。');
        return;
    }




    // 2. JSONデータを生成・検証
    const mapDataToSend = updateMapDataJSON();

    // updateMapDataJSON が null を返した場合 (検証エラー) は処理を中断
    if (!mapDataToSend) {
        console.error('マップデータの生成/検証に失敗しました。アップロードを中止します。');
        // updateMapDataJSON内で既にalertが表示されているはず
        return;
    }


    // 3. 共通キーを追加 (サーバー認証用)
    mapDataToSend.key = uploadKey;

    let localSocket = null; // この処理内でのみ使うソケットインスタンス
    let connectionTimeout = null; // 接続タイムアウト用タイマー

    try {
        localSocket = io(serverUrl, {
            // オプション: 接続試行時間を短くするなど
            reconnection: false, // 再接続はしない（毎回新規接続のため）
            timeout: 5000, // 接続タイムアウトを5秒に設定 (デフォルトは20秒)
            forceNew: true // 新しい接続を強制する
        });

        // --- 5. イベントリスナーを一時的に設定 ---

        // 接続成功時の処理
        localSocket.on('connect', () => {
            clearTimeout(connectionTimeout); // タイムアウトをクリア
            console.log('Socket connected successfully. Socket ID:', localSocket.id);

            // データ送信
            localSocket.emit('create_new_map', mapDataToSend);
            console.log('Emitted create_new_map event.');

             // ★ 応答待ちタイムアウトを設定 (例: 10秒)
            const responseTimeout = setTimeout(() => {
                 console.error('Server response timeout (map_created).');
                 alert('サーバーからの応答がありませんでした。');
                 if (localSocket) localSocket.disconnect(); // 切断
                 if (uploadButton) { // ボタンを元に戻す
                     uploadButton.disabled = false;
                     uploadButton.textContent = 'サーバーにアップロード';
                 }
            }, 10000); // 10秒

             // ★ サーバーからの応答 (`map_created`) を待つリスナー
             localSocket.on('map_created', (data) => {
                clearTimeout(responseTimeout); // 応答タイムアウトをクリア
                console.log('Received map_created event:', data);
                 if (data.status === 'success') {
                     alert('マップがサーバーに正常に作成されました！\n' +
                        'Blocklyでは接続ブロックから「' + mapDataToSend.name + '」を選択して接続、\n' +
                        'そのほかプログラミング言語では「' + mapDataToSend.room_id + '」をルームIDとして指定して接続してください\n' 
                    );
                 } else {
                     alert('マップの作成に失敗しました。キーが違うか、サーバー側でエラーが発生しました。');
                 }
                 // 応答を受け取ったら切断
                 if (localSocket) localSocket.disconnect();
             });
        });

        

        // --- 6. 接続タイムアウト設定 ---
        connectionTimeout = setTimeout(() => {
            console.error('Socket connection attempt timed out.');
            alert(`サーバーへの接続がタイムアウトしました: ${serverUrl}`);
            updateUploadStatus('❌ タイムアウト: 接続試行');
            if (localSocket) {
                 // タイムアウト後に接続が確立する可能性もあるため、リスナーを削除してから切断
                 localSocket.off('connect');
                 localSocket.off('connect_error');
                 localSocket.off('disconnect');
                 localSocket.disconnect();
            }
            localSocket = null;
            if (uploadButton) { // ボタンを元に戻す
                 uploadButton.disabled = false;
                 uploadButton.textContent = 'サーバーにアップロード';
             }
        }, 5000); // 接続タイムアウト (io() の timeout オプションと合わせるか、少し長めに設定)


    } catch (error) {
        // io() の呼び出し自体で同期的なエラーが発生する場合 (URL形式不正など)
        console.error("Socket.IO initialization error:", error);
        alert(`Socket.IOの初期化に失敗しました: ${error.message}`);
        localSocket = null;
        if (uploadButton) { // ボタンを元に戻す
            uploadButton.disabled = false;
            uploadButton.textContent = 'サーバーにアップロード';
        }
    }



});




/// マップのセルのタイプを設定する関数(upload用)
function setCellTypeByUpload(cell, i, j) {
    const type = parseInt(cell.dataset.type, 10); // 数値型に変換
    mapData[i][j] = type; // mapDataを更新
    const types = [
        { type: 0, color: '#ffffff', image: null },
        { type: 1, color: '#000000', image: 'image/wall.png' },
        { type: 2, color: '#ff69b4', image: 'image/hart.png' },
        { type: 3, color: '#ffffff', image: 'image/cool.png' },
        { type: 4, color: '#ffffff', image: 'image/hot.png' }
    ];
    const { color, image } = types[type];
    if (image) {
        cell.style.backgroundImage = `url(${image})`;
        cell.style.backgroundSize = 'cover';
    } else {
        cell.style.backgroundColor = color;
        cell.style.backgroundImage = '';
    }

    // プレイヤー位置を更新
    if (type === 3 || type === 4) {
        const playerType = type === 3 ? 'C' : 'H';
        playerPositions[playerType] = [i, j];
    }
}



// JSONを読み込んでフォームフィールドを更新する関数
function updateFormFieldsFromJSON(jsonString) {
    const jsonData = JSON.parse(jsonString);
    console.log(jsonData);


    //右部分
    // マップ名とIDを更新
    document.getElementById('room-name').value = jsonData.name || '';
    
    //IDからvs_ or pvt_を削除
    if(jsonData.room_id.startsWith("vs_")){
        jsonData.room_id=jsonData.room_id.replace("vs_","");
    }else if(jsonData.room_id.startsWith("pvt_")){
        jsonData.room_id=jsonData.room_id.replace("pvt_","");
    }
    //document.getElementById('room-id').value = jsonData.room_id || '';

    // ターン数を更新
    document.getElementById('turn-count').value = jsonData.turn || '';

    // JSON.cpuが存在する場合、CPUの設定を更新
    if (jsonData.cpu) {
        document.getElementById('cpu-toggle').checked = true;
        document.getElementById('cpu-options').style.display = 'block';
        //levelは文字列で渡されるので、?以降を分離して格納
        const cpuLevel = jsonData.cpu.level.split('?')[0];
        document.getElementById('cpu-level').value = cpuLevel || '';
        //level=2の場合、詳細オプションを表示
        document.getElementById('cpu-detail-options').style.display = cpuLevel === '2' ? 'block' : 'none';

        document.getElementById('cpu-turn').value = jsonData.cpu.turn || '';

        if (cpuLevel === '2' ) {
            // 詳細オプションがONの場合、詳細オプションを表示
            document.getElementById('cpu-detail-options').style.display = 'block';

            if(jsonData.cpu.level.split('?')[1]!==undefined){
                document.getElementById('cpu-advanced-option').checked = true;
                document.getElementById('cpu-detail-options2').style.display = 'block';

                const options = jsonData.cpu.level.split('?')[1].split('&');
                options.forEach(option => {
                    const [key, value] = option.split('=');
                    if (key === 'hotoke') {
                        document.getElementById('cpu-toggle-hotoke').checked = true;
                        document.getElementById('cpu-option-hotoke').value = value;
                        document.getElementById('cpu-option-hotoke').disabled = false;
                    } else if (key === 'item') {
                        document.getElementById('cpu-toggle-item').checked = true;
                        document.getElementById('cpu-option-item').value = value;
                        document.getElementById('cpu-option-item').disabled = false;
                    } else if (key === 'naname') {
                        document.getElementById('cpu-toggle-naname').checked = value === '1';
                    }
                });
            }
        } else {
            document.getElementById('cpu-advanced-option').checked = false;
            document.getElementById('cpu-detail-options2').style.display = 'none';
        }
    } else {
        document.getElementById('cpu-toggle').checked = false;
        document.getElementById('cpu-options').style.display = 'none';
    }
    
    //マップの生成状態を取得
    const mapGenerateType = jsonData.map_data ? "manual" : "random";
    document.getElementById('map-generation-toggle').value = mapGenerateType;
    document.getElementById('map-generation-toggle').dispatchEvent(new Event('change'));//changeイベントを発火させて表示を更新
    //マップのサイズを取得
    const mapSizeX = jsonData.map_size_x || 15;
    const mapSizeY = jsonData.map_size_y || 17;
    document.getElementById('map-size-x').value = mapSizeX;
    document.getElementById('map-size-y').value = mapSizeY;
    //マップのサイズを更新
    createMap(mapSizeX, mapSizeY);
    //マップのデータを取得
    if (jsonData.map_data) {
        mapData = jsonData.map_data;
        const cells = document.querySelectorAll('#map-container .cell');
        if (mapData.length !== mapSizeY || mapData[0].length !== mapSizeX) {
            console.error('mapData dimensions do not match mapSizeX and mapSizeY');
            return;
        }
        cells.forEach((cell, index) => {
            const i = Math.floor(index / mapSizeX);
            const j = index % mapSizeX;
            if (mapData[i] && mapData[i][j] !== undefined) {
            const type = mapData[i][j];
            cell.dataset.type = type;
            setCellTypeByUpload(cell, i, j);
            if (type === 3 || type === 4) {
                // Update player positions for Cool (C) or Hot (H)
                const playerType = type === 3 ? 'C' : 'H';
                playerPositions[playerType] = [i, j];
            }
            } else {
            console.error(`Invalid mapData at position [${i}][${j}]`);
            }
        });
        mapData = jsonData.map_data;
    } else {
        // 自動生成の場合、各パラメータを取得してJSONに格納
        document.getElementById('auto-block').value = jsonData.auto_block || 0;
        document.getElementById('auto-point').value = jsonData.auto_point || 0;
        document.getElementById('auto-obstacle').checked = jsonData.auto_symmetry || false;
    }
}

// ページが読み込まれたときに実行される処理
document.addEventListener('DOMContentLoaded', () => {
    // id="upload-urlに自身のドメインを格納
    // /以降はサーバー側で取得するので、/は削除しておく
    document.getElementById('upload-url').value = location.origin.replace(/\/$/, '');
    document.getElementById('map-generation-toggle').dispatchEvent(new Event('change'));
    // 初期パレットとマップ生成
    createPalette();
    createMap(15, 17);
});