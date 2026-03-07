const DEMO_SCRIPT = {
    "meta": {
        "title": "Đêm Mưa Sát Nhân",
        "subtitle": null,
        "desc": "Một đêm mưa gió sấm chớp, mất điện đột ngột, tên sát nhân lẻn vào nhà. Sửa cầu dao, báo cảnh sát, tránh và chiến đấu với hắn.",
        "writer": "AI Generated",
        "studio": null,
        "version": "9.3.0",
        "language": "vi",
        "cover": null,
        "tags": ["horror", "puzzle"],
        "ageRating": "18+",
        "difficulty": "normal",
        "estimatedPlayTime": 30,
        "entryScene": "scene1",
        "entryCharacter": "char1",
        "createdAt": "2026-01-13T11:05:00+07:00",
        "updatedAt": "2026-02-01T23:30:00+07:00",
        "copyright": "xAI Demo",
        "license": "CC0",
        "notes": null
    },
    "config": {
        "minTransition": 2,
        "minAutomationNextStep": 2,
        "maxCharacterMoving": 10,
        "maxInventory": [],
        "maxHandOn": 10,
        "brokenDisable": false,
        "minCharacterMoving": 30,
        "stopEffectWhenChat": false,
        "navContact": true,
        "navInventory": true,
        "defaultNotice": true,
        "clickHintDesc": 3,
        "allDescRead": true
    },
    "globalStates": {
        "electricity_on": { "type": "boolean", "value": false },
        "killer_alert": { "type": "boolean", "value": false },
        "police_called": { "type": "boolean", "value": false },
        "fight_count": { "type": "number", "value": 0 },
        "rain_intensity": { "type": "string", "value": "heavy" }
    },
    "templates": {
        "requirements": {
            "has_phone": { "logic": "AND", "check": [{ "type": "item", "subtype": "inventory", "op": "has", "value": "item2" }] },
            "has_toolbox": { "logic": "AND", "check": [{ "type": "item", "subtype": "inventory", "op": "has", "value": "item4" }] },
            "has_key": { "logic": "AND", "check": [{ "type": "item", "subtype": "inventory", "op": "has", "value": "item7" }] }
        },
        "effects": {
            "notify_danger": [{ "type": "notify", "subtype": "modal", "text": "Sát nhân tấn công", "level": "error" }],
            "damage_player": [{ "type": "stats", "subtype": "characters", "target": "char1", "property": "HP", "value": -40, "mode": "add", "notify": true }],
            "damage_killer": [{ "type": "stats", "subtype": "characters", "target": "char2", "property": "HP", "value": -20, "mode": "add", "notify": true }],
            "turn_on_electricity": [
                { "type": "set", "subtype": "state", "target": "global", "property": "electricity_on", "value": true },
                { "type": "notify", "subtype": "toast", "text": "Điện đã bật lại! Ánh sáng trở về 🏠✨", "level": "success" }
            ],
            "hint_fusebox": [{ "type": "notify", "subtype": "toast", "text": "Mã cầu dao là 2519 (gợi ý từ bạn bè)", "level": "info" }],
            "police_coming": [
                { "type": "set", "subtype": "state", "target": "global", "property": "police_called", "value": true },
                { "type": "notify", "subtype": "toast", "text": "Cảnh sát đang trên đường! 🚔", "level": "success" }
            ],
            "win_game": [{ "type": "goto", "subtype": "end", "target": "ending1" }]
        },
        "automation": {}
    },
    "endings": {
        "ending1": { "title": "Chiến thắng 🌟", "desc": "Bạn sửa được điện, gọi cảnh sát kịp thời và sống sót. Sát nhân bị bắt!" },
        "ending2": { "title": "Chết thảm 💀", "desc": "Sát nhân đuổi kịp, bạn không thoát được." },
        "ending3": { "title": "Trốn thoát 🏃", "desc": "Bạn cố mở cửa thoát ra ngoài trong mưa gió, nhưng chưa hoàn hảo." }
    },
    "itemInfo": {
        "item1": {
            "name": "Đèn pin",
            "icon": "flashlight_on",
            "desc": "Chiếu sáng bóng tối.",
            "requirements": null,
            "effect": {
                "use": [{ "type": "effect", "inline": { "type": "notify", "subtype": "toast", "text": "Bật đèn pin", "level": "info" } }],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 100, "status": [[80, "good"], [20, "low"]] },
            "stats": {}
        },
        "item2": {
            "name": "Điện thoại",
            "icon": "smartphone",
            "desc": "Gọi cứu hộ.",
            "requirements": null,
            "effect": { "use": [], "equip": [], "unequip": [] },
            "usage": { "current": 0, "max": 1, "status": [[10, "good"], [5, "broken"]] },
            "stats": {}
        },
        "item3": {
            "name": "Dao gọt trái cây",
            "icon": "knife",
            "desc": "Tự vệ khi gặp sát nhân.",
            "requirements": null,
            "effect": {
                "use": [{ "type": "effect", "ref": "damage_killer" }],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 5, "status": [[10, "sharp"], [2, "dull"]] },
            "stats": {}
        },
        "item4": {
            "name": "Hộp công cụ",
            "icon": "build",
            "desc": "Sửa chữa cầu dao.",
            "requirements": null,
            "effect": { "use": [], "equip": [], "unequip": [] },
            "usage": { "current": 0, "max": 1, "status": [[10, "good"], [5, "broken"]] },
            "stats": {}
        },
        "item5": {
            "name": "Dây điện dự phòng",
            "icon": "electrical_services",
            "desc": "Thay thế dây hỏng.",
            "requirements": null,
            "effect": { "use": [], "equip": [], "unequip": [] },
            "usage": { "current": 0, "max": 1, "status": [[10, "good"], [5, "broken"]] },
            "stats": {}
        },
        "item6": {
            "name": "Pin dự phòng",
            "icon": "battery_charging_full",
            "desc": "Nạp cho đèn pin.",
            "requirements": null,
            "effect": {
                "use": [{ "type": "effect", "inline": { "type": "item", "subtype": "usage", "target": "item1", "property": "usage", "value": 50 } }],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 100, "status": [[10, "full"], [5, "empty"]] },
            "stats": {}
        },
        "item7": {
            "name": "Chìa khóa hầm",
            "icon": "key",
            "desc": "Mở cửa hầm ngầm.",
            "requirements": null,
            "effect": { "use": [], "equip": [], "unequip": [] },
            "usage": { "current": 40, "max": 80, "status": [[10, "good"], [5, "broken"]] },
            "stats": {}
        },
        "item8": {
            "name": "Bản đồ nhà",
            "icon": "map",
            "desc": "Xem sơ đồ các phòng.",
            "requirements": null,
            "effect": {
                "use": [{ "type": "effect", "inline": { "type": "notify", "subtype": "modal", "text": "Bản đồ: Phòng khách -> Nhà bếp -> Hầm (cần chìa khóa)", "level": "info" } }],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 1, "status": [[10, "good"], [5, "torn"]] },
            "stats": {}
        },
        "item9": {
            "name": "Hộp sơ cứu",
            "icon": "local_hospital",
            "desc": "Hồi máu.",
            "requirements": null,
            "effect": {
                "use": [{ "type": "effect", "inline": { "type": "stats", "subtype": "characters", "target": "char1", "property": "HP", "value": 50, "mode": "add" } }],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 3, "status": [[10, "full"], [1, "empty"]] },
            "stats": {}
        },
        "item10": {
            "name": "Gậy bóng chày",
            "icon": "sports_martial_arts",
            "desc": "Vũ khí mạnh đánh sát nhân.",
            "requirements": null,
            "effect": {
                "use": [
                    { "type": "effect", "inline": { "type": "stats", "subtype": "characters", "target": "char2", "property": "HP", "value": -80, "mode": "add" } },
                    { "type": "effect", "inline": { "type": "notify", "text": "Đánh trúng sát nhân! 💥", "level": "success" } }
                ],
                "equip": [],
                "unequip": []
            },
            "usage": { "current": 0, "max": 3, "status": [[10, "solid"], [1, "broken"]] },
            "stats": {}
        }
    },
    "passwords": {
        "number": {
            "num_keyboard": {
                "desc": "Nhập mã số 1235564 bằng bàn phím số.",
                "display": "keyboard",
                "value": "4871",
                "retryMax": 3
            },
            "num_combination": {
                "desc": "Mở khóa vali bằng mã xoay (Combination). Mã: 999.",
                "display": "combination",
                "value": "99",
                "retryMax": 0
            },
            "num_rotary": {
                "desc": "Điện thoại quay số cổ điển. Mã: 8080.",
                "display": "rotary_dial",
                "value": "8080",
                "retryMax": 3
            },
            "fusebox_code": {
                "desc": "Mã cầu dao (gợi ý từ bạn bè).",
                "display": "keyboard",
                "value": "2519",
                "retryMax": 3
            }
        },
        "switch": {
            "switch": {
                "desc": "a switch",
                "value": "064",
                "retryMax": 3
            }
        },
        "string": {
            "str_basic": {
                "desc": "Nhập mật khẩu chữ 'OPEN'.",
                "value": "OPEN",
                "retryMax": 3
            },
            "str_with_hint": {
                "desc": "Mật khẩu dài có gợi ý (SECRET).",
                "value": "SECRET",
                "hint": [0, 2, 5],
                "retryMax": 5,
                "timer": 30
            }
        },
        "find_way": {
            "way_simple": {
                "desc": "Vẽ đường đi từ góc trái trên xuống phải dưới.",
                "area": [3, 3],
                "start": [0, 0],
                "target": [2, 2],
                "street": [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
                "retryMax": 3
            },
            "way_complex": {
                "desc": "Mê cung 5x5 phức tạp hơn.",
                "area": [5, 5],
                "start": [0, 0],
                "target": [4, 4],
                "street": [
                    [0, 0], [1, 0], [2, 0],
                    [2, 1], [2, 2], [3, 2],
                    [3, 3], [4, 3], [4, 4]
                ],
                "retryMax": 3,
                "timer": 45
            }
        },
        "puzzle": {
            "puz_easy": {
                "desc": "Ghép tranh 3x3 đơn giản.",
                "url": "https://picsum.photos/600/600",
                "ratio": [1, 1],
                "level": "easy",
                "retryMax": 0
            },
            "puz_hard_timed": {
                "desc": "Ghép tranh 4x4 khó, có giới hạn thời gian.",
                "url": "assets/images/thumbnail.jpg",
                "ratio": [3, 4],
                "level": "easy",
                "retryMax": 1,
                "timer": 120
            }
        }
    },
    "scenes": {
        "scene1": {
            "meta": {
                "title": "Phòng khách tối om",
                "parentScene": null
            },
            "set": {
                "activeRouterId": "router1",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 1.5
            },
            "routers": {
                "router1": {
                    "meta": { "sceneID": "scene1", "subTitleStatus": "Sấm chớp ngoài cửa sổ", "desc": "Phòng khách tối tăm, mưa gió rít qua cửa.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 10, "timer": null, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": "glitch", "transitionDuration": 1.1, "overlay": "light", "overlayFlick": 2 },
                    "loop": { "enter": [], "leave": [], "still": [{ "type": "effect", "inline": { "type": "notify", "subtype": "toast", "text": "Tiếng động lạ từ bếp...", "level": "warn" } }] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_flashlight", "action_move_router2", "action_call_friend"]
                },
                "router2": {
                    "meta": { "sceneID": "scene1", "subTitleStatus": "Góc tối", "desc": "Góc phòng, có chìa khóa rơi.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": "dark", "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_key", "action_move_router1", "action_move_router4"]
                },
                "router3": {
                    "meta": { "sceneID": "scene1", "subTitleStatus": "Cửa chính", "desc": "Cửa chính khóa chặt, mưa bên ngoài.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": "dark", "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_try_escape", "action_move_router1"]
                },
                "router4": {
                    "meta": { "sceneID": "scene1", "subTitleStatus": "Bàn ghế", "desc": "Trên bàn có điện thoại.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": "dark", "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_phone", "action_move_router2", "action_to_kitchen"]
                }
            }
        },
        "scene2": {
            "meta": { "title": "Nhà bếp ẩm ướt", "parentScene": null },
            "set": { "activeRouterId": "router5", "blocked": false, "transition": "slide_right", "transitionDuration": 1.5 },
            "routers": {
                "router5": {
                    "meta": { "sceneID": "scene2", "subTitleStatus": "Tiếng nước nhỏ giọt", "desc": "Nhà bếp tối, có tiếng động lạ.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 8, "timer": null, "timerSeconds": 45, "timerDisplay": "dec", "timerEnd": "out", "transition": "blur", "transitionDuration": 2.5, "overlay": "dark", "overlayFlick": 1.5 },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": [{ "type": "effect", "inline": { "type": "notify", "subtype": "toast", "text": "Sát nhân gần đây? Chạy đi!", "level": "warn" } }]
                    },
                    "timer": {
                        "start": [],
                        "end": [{ "type": "effect", "inline": { "type": "goto", "subtype": "end", "target": "ending2" } }]
                    },
                    "actions": ["action_to_livingroom", "action_move_router6"]
                },
                "router6": {
                    "meta": { "sceneID": "scene2", "subTitleStatus": "Tủ lạnh", "desc": "Trong tủ lạnh có hộp công cụ.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": null, "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_toolbox", "action_move_router5", "action_move_router7"]
                },
                "router7": {
                    "meta": { "sceneID": "scene2", "subTitleStatus": "Bàn ăn", "desc": "Trên bàn có dao.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": null, "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_knife", "action_to_basement", "action_move_router6"]
                }
            }
        },
        "scene3": {
            "meta": { "title": "Hầm ngầm lạnh lẽo", "parentScene": null },
            "set": { "activeRouterId": "router8", "blocked": true, "transition": "zoom_in", "transitionDuration": 2 },
            "routers": {
                "router8": {
                    "meta": { "sceneID": "scene3", "subTitleStatus": "Nước đọng", "desc": "Hầm tối, cầu dao ở cuối.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 12, "timer": true, "timerSeconds": 30, "timerDisplay": "dec", "timerEnd": "still", "transition": "shake_up_down_blur", "transitionDuration": 4, "overlay": "dark", "overlayFlick": 2 },
                    "loop": {
                        "enter": [{ "type": "effect", "inline": { "type": "notify", "subtype": "modal", "text": "Hầm tối om, sát nhân có thể ở đây!", "level": "warn" } }],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": [
                            {
                                "type": "manage_effect",
                                "inline": {
                                    "space": "router", "in": "still", "target": "router8", "subtype": "add_effect",
                                    "content": { "type": "effect", "inline": { "type": "notify", "text": "Thời gian sắp hết! Sửa nhanh lên!", "level": "error" } }
                                }
                            }
                        ]
                    },
                    "actions": ["action_move_router9", "action_use_firstaid"]
                },
                "router9": {
                    "meta": { "sceneID": "scene3", "subTitleStatus": "Cầu dao hỏng", "desc": "Tủ điện cháy dây, cần mã và công cụ.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": "blood", "overlayFlick": null },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_fix_fusebox", "action_move_router8", "action_move_router10"]
                },
                "router10": {
                    "meta": { "sceneID": "scene3", "subTitleStatus": "Góc tối", "desc": "Có gậy bóng chày.", "cover": "" },
                    "set": { "blocked": false, "visited": false, "countVisited": 0, "secondsStill": 0, "timer": false, "timerSeconds": 60, "timerDisplay": null, "timerEnd": null, "transition": null, "transitionDuration": 3, "overlay": null, "overlayFlick": false, "overlayFlickDuration": 3 },
                    "loop": { "enter": [], "leave": [], "still": [] },
                    "timer": { "start": [], "end": [] },
                    "actions": ["action_get_bat", "action_move_router9"]
                }
            }
        }
    },
    "actions": {
        "action_get_flashlight": {
            "meta": { "title": "Lấy đèn pin", "thumb": "", "desc": "Dưới ghế sofa có đèn pin.", "buttonIcon": "flashlight_off", "buttonLabel": "Lấy" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": 0, "display": "show", "charAllow": [], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [
                    { "type": "effect", "inline": { "type": "notify", "subtype": "toast", "text": "Đã lấy đèn pin!", "level": "success" } },
                    { "type": "item", "subtype": "add", "target": "item1", "hide": true }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_get_phone": {
            "meta": { "title": "Lấy điện thoại", "thumb": "", "desc": "Điện thoại trên bàn.", "buttonIcon": "phone", "buttonLabel": "Lấy" },
            "set": { "requirement": false, "password": null, "countClicks": 0, "countFails": 0, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [
                    { "type": "effect", "inline": { "type": "notify", "text": "Đã lấy điện thoại!" } },
                    { "type": "item", "subtype": "add", "target": "item2", "hide": true }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_get_toolbox": {
            "meta": { "title": "Lấy hộp công cụ", "thumb": "", "desc": "Hộp công cụ trong tủ lạnh.", "buttonIcon": "build", "buttonLabel": "Lấy 🛠️" },
            "set": { "requirement": false, "password": null, "countClicks": 0, "countFails": 0, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [
                    { "type": "effect", "inline": { "type": "notify", "text": "Hộp công cụ hữu ích!" } },
                    { "type": "item", "subtype": "add", "target": "item4", "hide": true }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_get_knife": {
            "meta": { "title": "Lấy dao", "thumb": "", "desc": "Dao trên bàn ăn.", "buttonIcon": "knife", "buttonLabel": "Lấy 🗡️" },
            "set": { "type": "get_item", "target": "item3", "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [{ "type": "effect", "inline": { "type": "notify", "text": "Dao tự vệ!" } }],
                "normal": [], "pwFailed": []
            }
        },
        "action_get_bat": {
            "meta": { "title": "Lấy gậy bóng chày", "thumb": "", "desc": "Vũ khí mạnh ở góc tối.", "buttonIcon": "sports_martial_arts", "buttonLabel": "Lấy ⚾" },
            "set": { "type": "get_item", "target": "item10", "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [{ "type": "effect", "inline": { "type": "notify", "text": "Gậy bóng chày - đánh bại sát nhân!" } }],
                "normal": [], "pwFailed": []
            }
        },
        "action_call_friend": {
            "meta": { "title": "Gọi bạn", "thumb": "", "desc": "Gọi bạn lấy gợi ý.", "buttonIcon": "call", "buttonLabel": "Gọi" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "locked", "charAllow": ["char1"], "cooldown": 10 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [
                    { "type": "effect", "inline": { "type": "notify", "text": "Bạn gọi cho bạn thân..." } },
                    { "type": "effect", "inline": { "type": "goto", "subtype": "chat", "target": "chat1" } }
                ],
                "pwFailed": []
            }
        },
        "action_call_police": {
            "meta": { "title": "Gọi cảnh sát", "thumb": "", "desc": "Dùng điện thoại gọi 113.", "buttonIcon": "local_police", "buttonLabel": "Gọi 🚔" },
            "set": { "requirement": true, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "ref": "has_phone" },
            "effect": {
                "fail": [{ "type": "effect", "inline": { "type": "notify", "text": "Cần điện thoại!", "level": "warn" } }],
                "pass": [
                    { "type": "goto", "subtype": "chat", "target": "chat4" },
                    { "type": "effect", "ref": "police_coming" }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_fix_fusebox": {
            "meta": { "title": "Sửa cầu dao", "thumb": "", "desc": "Nhập mã và dùng công cụ.", "buttonIcon": "electrical_services", "buttonLabel": "Sửa ⚡" },
            "set": { "requirement": true, "password": "number:fusebox_code", "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "ref": "has_toolbox" },
            "effect": {
                "fail": [{ "type": "effect", "inline": { "type": "notify", "text": "Cần hộp công cụ!", "level": "error" } }],
                "pass": [
                    { "type": "effect", "ref": "turn_on_electricity" },
                    { "type": "req", "inline": { "logic": "AND", "check": [{ "type": "state", "subtype": "global", "op": "==", "value": true, "property": "police_called" }] } },
                    { "type": "effect", "ref": "win_game" }
                ],
                "normal": [],
                "pwFailed": [
                    { "type": "effect", "inline": { "type": "notify", "text": "Mã sai! Sát nhân gần hơn...", "level": "error" } },
                    { "type": "effect", "inline": { "type": "set", "subtype": "state", "target": "global", "property": "killer_alert", "value": true } }
                ]
            }
        },
        "action_to_kitchen": {
            "meta": { "title": "Đi nhà bếp", "thumb": "", "desc": "Cửa dẫn vào bếp.", "buttonIcon": "kitchen", "buttonLabel": "Đi ➡️" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 2 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "scene", "target": "scene2" }],
                "pwFailed": []
            }
        },
        "action_to_livingroom": {
            "meta": { "title": "Về phòng khách", "thumb": "", "desc": "Quay lại phòng khách.", "buttonIcon": "home", "buttonLabel": "Về ⬅️" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 2 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "scene", "target": "scene1" }],
                "pwFailed": []
            }
        },
        "action_to_basement": {
            "meta": { "title": "Xuống hầm", "thumb": "", "desc": "Cửa hầm (cần chìa khóa).", "buttonIcon": "stairs_down", "buttonLabel": "Xuống 🔽" },
            "set": { "requirement": true, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "ref": "has_key" },
            "effect": {
                "fail": [{ "type": "effect", "inline": { "type": "notify", "text": "Cần chìa khóa!", "level": "warn" } }],
                "pass": [
                    { "type": "effect", "inline": { "type": "set", "subtype": "scene", "target": "scene3", "property": "blocked", "value": false } },
                    { "type": "goto", "subtype": "scene", "target": "scene3" }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_try_escape": {
            "meta": { "title": "Thoát ra ngoài", "thumb": "", "desc": "Cửa chính khóa.", "buttonIcon": "door_front", "buttonLabel": "Mở cửa 🚪" },
            "set": { "requirement": false, "password": null, "countClicks": 3, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [{ "type": "effect", "inline": { "type": "notify", "text": "Cửa khóa chặt, mưa lớn không thoát được.", "level": "warn" } }],
                "pass": [{ "type": "effect", "inline": { "type": "goto", "subtype": "end", "target": "ending3" } }],
                "normal": [], "pwFailed": []
            }
        },
        "action_use_firstaid": {
            "meta": { "title": "Dùng sơ cứu", "thumb": "", "desc": "Chữa vết thương.", "buttonIcon": "healing", "buttonLabel": "Sơ cứu 💉" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 5 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [
                    { "type": "item", "subtype": "usage", "target": "item9", "value": -1 },
                    { "type": "stats", "subtype": "characters", "target": "char1", "property": "HP", "value": 50, "mode": "add" }
                ],
                "normal": [], "pwFailed": []
            }
        },
        "action_move_router2": {
            "meta": { "title": "Di chuyển góc phòng", "desc": null, "buttonLabel": "Đi góc" },
            "set": { "type": "swap_router", "target": "router2", "requirement": false, "password": "number:num_keyboard", "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], readDesc: false },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [{ "type": "effect", "inline": { "type": "goto", "subtype": "scene", "target": "scene2" } }],
                "normal": [],
                "pwFailed": [{ "type": "effect", "inline": { "type": "notify", "text": "Sai số!" } }]
            }
        },
        "action_move_router1": {
            "meta": { "title": "Về giữa phòng", "desc": "Quay lại giữa phòng khách.", "buttonLabel": "Về giữa" },
            "set": { "type": "swap_router", "target": "router1", "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": { "fail": [], "pass": [], "normal": [], "pwFailed": [] }
        },
        "action_move_router4": {
            "meta": { "title": "Đến bàn", "desc": "Sang bàn ghế.", "buttonLabel": "Đến bàn" },
            "set": { "type": "swap_router", "target": "router4", "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": { "fail": [], "pass": [], "normal": [], "pwFailed": [] }
        },
        "action_move_router6": {
            "meta": { "title": "Đến tủ lạnh", "desc": "", "buttonLabel": "Tủ lạnh" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "router", "target": "scene2.router6" }],
                "pwFailed": []
            }
        },
        "action_move_router7": {
            "meta": { "title": "Đến bàn ăn", "desc": "", "buttonLabel": "Bàn ăn" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "router", "target": "scene2.router7" }],
                "pwFailed": []
            }
        },
        "action_move_router9": {
            "meta": { "title": "Đến cầu dao", "desc": "", "buttonLabel": "Cầu dao" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "router", "target": "scene3.router9" }],
                "pwFailed": []
            }
        },
        "action_move_router10": {
            "meta": { "title": "Đến góc tối", "desc": "", "buttonLabel": "Góc tối" },
            "set": { "requirement": false, "password": null, "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"] },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [], "pass": [],
                "normal": [{ "type": "goto", "subtype": "router", "target": "scene3.router10" }],
                "pwFailed": []
            }
        },
        "action_get_key": {
            "meta": { "title": "Lấy chìa khóa", "thumb": "", "desc": "Chìa khóa rơi ở góc phòng.", "buttonIcon": "key", "buttonLabel": "Lấy 🔑" },
            "set": { "type": "get_item", "target": "item7", "requirement": false, "password": "puzzle:puz_easy", "countClicks": null, "countFails": null, "display": "show", "charAllow": ["char1"], "cooldown": 0 },
            "requirement": { "logic": null, "check": [] },
            "effect": {
                "fail": [],
                "pass": [{ "type": "effect", "inline": { "type": "notify", "text": "Đã lấy chìa khóa!" } }],
                "normal": [], "pwFailed": []
            }
        }
    },
    "chat": {
        "chat1": {
            "meta": { "title": "Gọi bạn bè", "loop": false, "sender": "char3", "entry": "b1", "to": ["char1"] },
            "block": {
                "b1": {
                    "line": [
                        { "char_id": "char3", "text": "Ê mày, mưa to quá, mất điện hả? Có chuyện gì không?" },
                        { "char_id": "char1", "text": "Ừ, tối om, tao nghe tiếng động lạ, hình như có sát nhân!" },
                        { "char_id": "char3", "text": "Mày có thể nói rõ hơn không?" }
                    ],
                    "choice_id": "c1", "choiced": false
                },
                "b2": {
                    "line": [{ "char_id": "char3", "text": "Ra xã hội làm ăn bươn chải, tao có thể giúp mày" }],
                    "choice_id": null, "choiced": false
                }
            },
            "choice": {
                "c1": [
                    { "text": "Cảm ơn, bye.", "effect": [], "jump": "b2" },
                    { "text": "Mày biết mã cầu dao không?", "effect": [{ "type": "effect", "ref": "hint_fusebox" }], "jump": null }
                ]
            }
        },
        "chat2": {
            "meta": { "title": "Suy nghĩ", "loop": true, "sender": null, "entry": "b1", "to": ["char1"] },
            "block": {
                "b1": { "line": [{ "char_id": "char1", "text": "Mưa gió, sấm chớp... Phải sửa điện nhanh!" }], "choice_id": null, "choiced": false }
            },
            "choice": {}
        },
        "chat3": {
            "meta": { "title": "Gặp sát nhân", "loop": false, "sender": "char2", "entry": "b1", "to": ["char1"] },
            "block": {
                "b1": {
                    "line": [{ "char_id": "char2", "text": "*Tiếng thở nặng nề*..." }, { "char_id": "char1", "text": "Chạy mau!" }],
                    "choice_id": null, "choiced": false
                }
            },
            "choice": {}
        },
        "chat4": {
            "meta": { "title": "Gọi cảnh sát", "loop": false, "sender": "char4", "entry": "b1", "to": ["char1"] },
            "block": {
                "b1": {
                    "line": [
                        { "char_id": "char4", "text": "Cảnh sát đây! Có chuyện gì?" },
                        { "char_id": "char1", "text": "Có sát nhân trong nhà, mất điện!" },
                        { "char_id": "char4", "text": "Giữ bình tĩnh, chúng tôi đến ngay!" }
                    ],
                    "choice_id": "c4", "choiced": false
                }
            },
            "choice": {
                "c4": [{ "text": "OK", "effect": [{ "type": "effect", "ref": "police_coming" }], "jump": null }]
            }
        },
        "chat5": {
            "meta": { "title": "Cảnh sát đến", "loop": false, "sender": "char4", "entry": "b1", "to": ["char1"] },
            "block": {
                "b1": { "line": [{ "char_id": "char4", "text": "Chúng tôi đã bắt được sát nhân. An toàn rồi!" }], "choice_id": null, "choiced": false }
            },
            "choice": {}
        }
    },
    "characters": {
        "char1": {
            "meta": { "name": "Bạn", "desc": "Nạn nhân" },
            "set": { "linkEffect": true, "alert": "notice", "actions": [], "moving": true, "move": null },
            "moveList": [],
            "effect": {
                "meeting": {
                    "char2": [
                        { "type": "effect", "ref": "notify_danger" },
                        { "type": "effect", "ref": "damage_player" },
                        { "type": "effect", "ref": "damage_killer" }
                    ]
                },
                "leave": {}
            },
            "stats": {
                "HP": { "current": 100, "max": 100, "label": "HP", "color": "#ff4444" },
                "Sanity": { "current": 100, "max": 100, "label": "Sanity", "color": "#44ff44" }
            },
            "linkChatIDs": ["chat2"],
            "met": [], "relationship": [], "currentScene": "scene1",
            "place": { "currentIndex": 0, "currentScene": "scene1" },
            "inventory": []
        },
        "char2": {
            "meta": { "name": "Sát nhân", "desc": "Kẻ săn mồi" },
            "set": { "linkEffect": false, "alert": "danger", "actions": [], "moving": true, "move": "random_weight" },
            "moveList": [
                { "scene_id": "scene1", "weight": 2, "count": -1, "speed": 20 },
                { "scene_id": "scene2", "weight": 3, "count": -1, "speed": 25 },
                { "scene_id": "scene3", "weight": 1, "count": -1, "speed": 30 }
            ],
            "effect": {
                "meeting": {
                    "char1": [{ "type": "effect", "ref": "notify_danger" }, { "type": "effect", "ref": "damage_player" }]
                },
                "leave": {
                    "char1": [{ "type": "effect", "inline": { "type": "notify", "text": "Sát nhân bỏ chạy tạm thời...", "level": "warn" } }]
                }
            },
            "stats": {
                "HP": { "current": 200, "max": 200, "label": "HP", "color": "#ff0000" },
                "Sanity": { "current": 50, "max": 50, "label": "Madness", "color": "#ff00ff" }
            },
            "linkChatIDs": ["chat3"],
            "met": [], "relationship": [["enemy", "char1"]], "currentScene": "scene2",
            "place": { "currentIndex": 0, "currentScene": "scene2" },
            "inventory": []
        },
        "char3": {
            "meta": { "name": "Bạn thân", "desc": "Người hỗ trợ" },
            "set": { "linkEffect": false, "alert": "success", "actions": [], "moving": false, "move": null },
            "moveList": [],
            "effect": { "meeting": {}, "leave": {} },
            "stats": { "HP": { "current": 100, "max": 100, "label": "HP" } },
            "linkChatIDs": ["chat1"],
            "met": ["char1:1"], "relationship": [["friend", "char1"]], "currentScene": "scene1",
            "place": { "currentIndex": 0, "currentScene": "scene1" },
            "inventory": []
        },
        "char4": {
            "meta": { "name": "Cảnh sát", "desc": "Cứu tinh" },
            "set": { "linkEffect": false, "alert": "success", "actions": [], "moving": false, "move": null },
            "moveList": [],
            "effect": {
                "meeting": {
                    "char2": [
                        { "type": "effect", "skip": true, "inline": { "type": "notify", "text": "Cảnh sát đã khống chế sát nhân!", "level": "success" } },
                        { "type": "effect", "skip": false, "ref": "win_game" }
                    ]
                },
                "leave": {}
            },
            "stats": { "HP": { "current": 150, "max": 150, "label": "HP" } },
            "linkChatIDs": ["chat4", "chat5"],
            "met": [], "relationship": [["ally", "char1"]], "currentScene": "scene1",
            "place": { "currentIndex": 0, "currentScene": "scene1" },
            "inventory": []
        }
    }
};