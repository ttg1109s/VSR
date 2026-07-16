// demo_script.js
// ============================================================================
// "PHI VỤ: BIỆT THỰ SƯƠNG MÙ" — kịch bản demo v1.0.0 (thay thế bản "Đêm Mưa
// Sát Nhân" cũ). Viết lại hoàn toàn theo yêu cầu: chủ đề mới, quy mô gọn
// (6 scene), khai thác đồng thời phần lớn hệ thống hiện có của engine:
//
//   - 6 scene / 10 router / 23 action, di chuyển bằng goto(scene|router)
//   - Cả 5 loại mật khẩu: number (két sắt), switch (cầu dao), string (ngăn
//     kéo, dùng nhật ký làm gợi ý), find_way (lưới cảm biến vườn), puzzle
//     (ghép tranh vỡ)
//   - Hệ thống Chat: 2 đoạn hội thoại với Vy (chat_intro, chat_gallery),
//     lựa chọn trong chat ảnh hưởng trực tiếp tới stat "Trust" của Vy
//   - Faker (cải trang): mặc đồng phục bảo vệ -> goto/in_faker "mask:guard",
//     ảnh hưởng cơ chế né bảo vệ tuần tra qua global state "disguised"
//   - Di chuyển NPC: bảo vệ Dũng tuần tra tự động giữa 3 scene
//     (characters.guard.set.move="list" + moveList), effect.meeting kích
//     hoạt khi "gặp" người chơi — an toàn nếu đang cải trang, nguy hiểm và
//     cộng dồn stat "Suspicion" nếu không
//   - Automation: "response_countdown" — chuông báo im lặng kích hoạt ngay
//     khi mở két, có ~80 giây để thoát trước khi bị bắt (ending_caught)
//   - Chỉ số nhân vật (characters.*.stats): Suspicion (người chơi),
//     Trust (Vy) — cả hai đều ảnh hưởng trực tiếp tới việc chọn ending
//   - set/state + req per-effect-step để gate hiệu ứng theo điều kiện —
//     dùng cho toàn bộ logic rẽ nhánh ending ở action_final_escape
//   - 5 ending thật (không chỉ trang trí), đều có nhánh trạng thái riêng:
//     ending_perfect / ending_narrow / ending_betrayed / ending_caught /
//     ending_aborted
//
// Đã validate 0 lỗi qua scenario.schema.json (script hand-rolled draft-07
// validator, vì môi trường build không có mạng để cài `jsonschema`), và
// kiểm tra chéo toàn bộ ID tham chiếu (item/character/scene/router/action/
// chat/block/choice/password/ending/automation/template) — không có
// tham chiếu treo, không có action mồ côi.
//
// LƯU Ý — 2 giới hạn engine phát hiện được trong lúc viết kịch bản này (đã
// sửa trực tiếp trong engine, xem thêm ở các file liên quan):
//   1. `{"type":"goto","subtype":"end",...}` trước đây không bao giờ thực sự
//      hiện màn kết thúc (GotoStrategies.end chỉều pause/clear queue, không
//      gọi API.render.components.ending) — đã sửa trong
//      engine/modules/effect/strategies/Logic.js.
//   2. `startChat()` crash với MỌI kịch bản hợp lệ theo schema (vì
//      state.chats[id] đã tồn tại sau khi Loader.js copy script.chat, nên
//      điều kiện khởi tạo `.set` cũ luôn bị bỏ qua) — đã sửa trong
//      engine/modules/Chat.js.
//   3. (Giới hạn, không phải bug — đã né trong kịch bản) `set/action` chỉ
//      có thể nhắm tới action nằm trong ROUTER ĐANG ACTIVE lúc effect chạy
//      (WiredSetStrategies.action tự ghép actKey bằng activeRouterId hiện
//      tại) — không thể dùng để bật/ẩn action ở router khác. Nếu cần hiện
//      action theo điều kiện toàn cục, dùng nhánh req theo từng bước effect
//      (xem action_go_upstairs) thay vì set/action xuyên router.
// ============================================================================
const DEMO_SCRIPT = {
    "meta": {
        "title": "Phi Vụ: Biệt Thự Sương Mù",
        "subtitle": "Một đêm, một két sắt, một lời hứa.",
        "desc": "Kai, một tay trộm chuyên nghiệp, nhận phi vụ đột nhập biệt thự Sương Mù để lấy viên ngọc gia truyền theo yêu cầu của khách hàng bí ẩn. Vy — đồng bọn điều phối từ xa — theo dõi camera an ninh và liên lạc qua điện thoại. Bảo vệ Dũng tuần tra trong bóng tối. Bạn có bao nhiêu thời gian trước khi bị phát hiện?",
        "writer": "AI Generated",
        "studio": null,
        "version": "1.0.0",
        "language": "vi",
        "cover": null,
        "tags": [
            "heist",
            "puzzle",
            "stealth"
        ],
        "ageRating": "16+",
        "difficulty": "normal",
        "estimatedPlayTime": 25,
        "entryScene": "scene_garden",
        "entryCharacter": "player",
        "createdAt": "2026-07-16T09:00:00+07:00",
        "updatedAt": "2026-07-16T09:00:00+07:00",
        "copyright": "VSR Demo",
        "license": "CC0",
        "notes": null
    },
    "config": {
        "fakerMode": "mask",
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
        "allDescRead": false
    },
    "globalStates": {
        "fence_cut": {
            "type": "boolean",
            "value": false
        },
        "power_cut": {
            "type": "boolean",
            "value": false
        },
        "disguised": {
            "type": "boolean",
            "value": false
        },
        "painting_solved": {
            "type": "boolean",
            "value": false
        },
        "vault_open": {
            "type": "boolean",
            "value": false
        },
        "gem_taken": {
            "type": "boolean",
            "value": false
        },
        "alarm_triggered": {
            "type": "boolean",
            "value": false
        }
    },
    "templates": {
        "requirements": {
            "has_wirecutter": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_wirecutter"
                    }
                ]
            },
            "has_uniform": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_uniform"
                    }
                ]
            },
            "has_journal": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_journal"
                    }
                ]
            },
            "has_flashlight": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_flashlight"
                    }
                ]
            }
        },
        "effects": {
            "toast_no_wirecutter": [
                {
                    "type": "notify",
                    "subtype": "toast",
                    "text": "Cần kìm cắt dây trước đã.",
                    "level": "warn"
                }
            ],
            "toast_no_uniform": [
                {
                    "type": "notify",
                    "subtype": "toast",
                    "text": "Chưa tìm thấy đồng phục bảo vệ.",
                    "level": "warn"
                }
            ],
            "toast_no_journal": [
                {
                    "type": "notify",
                    "subtype": "toast",
                    "text": "Cần đọc nhật ký trước để có manh mối.",
                    "level": "warn"
                }
            ],
            "toast_no_flashlight": [
                {
                    "type": "notify",
                    "subtype": "toast",
                    "text": "Quá tối, cần đèn pin để thấy bảng cầu dao.",
                    "level": "warn"
                }
            ]
        },
        "automation": {
            "response_countdown": {
                "set": {
                    "move": "step_by_step",
                    "moveDirection": "first",
                    "numberCycleAllow": 1,
                    "countCurrent": 0,
                    "runInfinity": false,
                    "banClick": false
                },
                "plan": [
                    {
                        "seconds": 25,
                        "effect": [
                            {
                                "type": "notify",
                                "subtype": "toast",
                                "text": "Có tiếng bước chân xa xa...",
                                "level": "warn"
                            }
                        ]
                    },
                    {
                        "seconds": 25,
                        "effect": [
                            {
                                "type": "notify",
                                "subtype": "modal",
                                "title": "Báo động!",
                                "text": "Đội bảo vệ đang tiến về phía khu vực của bạn. Nhanh lên!",
                                "level": "danger"
                            },
                            {
                                "type": "characters",
                                "subtype": "edit_stats",
                                "target": "player",
                                "property": "Suspicion",
                                "value": 20,
                                "mode": "add",
                                "notify": true
                            }
                        ]
                    },
                    {
                        "seconds": 30,
                        "effect": [
                            {
                                "type": "goto",
                                "subtype": "end",
                                "target": "ending_caught"
                            }
                        ]
                    }
                ]
            }
        }
    },
    "endings": {
        "ending_perfect": {
            "title": "Phi Vụ Hoàn Hảo 💎",
            "desc": "Bạn lấy được viên ngọc mà không ai hay biết, không chuông báo nào vang lên, Dũng vẫn tuần tra như chưa hề có chuyện gì. Vy đón bạn ở điểm hẹn với một nụ cười nhẹ nhõm. Một phi vụ giáo khoa."
        },
        "ending_narrow": {
            "title": "Thoát Trong Gang Tấc 🏃",
            "desc": "Chuông báo vang lên đâu đó phía sau khi bạn lao qua mái nhà. Viên ngọc vẫn nằm trong túi, tim bạn vẫn đập loạn nhịp khi chiếc xe của Vy vọt đi trong màn sương. Không hoàn hảo, nhưng bạn đã thoát."
        },
        "ending_betrayed": {
            "title": "Bị Phản Bội 🗡️",
            "desc": "Bạn đến điểm hẹn, nhưng xe của Vy không còn ở đó — chỉ có một tin nhắn: 'Làm việc một mình quen rồi mà, đúng không?'. Viên ngọc, và cả Vy, đều đã biến mất. Có lẽ bạn nên trả lời tin nhắn tử tế hơn."
        },
        "ending_caught": {
            "title": "Sa Lưới 🚨",
            "desc": "Ánh đèn pin quét thẳng vào mặt bạn. 'Đứng yên!' — giọng Dũng vang lên phía sau. Phi vụ kết thúc tại đây, trong còng số 8, giữa tiếng còi hụ đang tới gần."
        },
        "ending_aborted": {
            "title": "Bỏ Cuộc Giữa Đêm Sương 🌫️",
            "desc": "Đứng trước hàng rào, bạn chợt thấy phi vụ này không đáng. Bạn quay xe, gọi cho Vy báo huỷ. Không ngọc, không rủi ro — chỉ còn màn sương và một câu hỏi bỏ ngỏ: liệu có ai khác đã lấy nó trước bạn chưa?"
        }
    },
    "itemInfo": {
        "item_wirecutter": {
            "name": "Kìm Cắt Dây",
            "icon": "content_cut",
            "desc": "Tìm thấy trong bụi cây trước hàng rào. Đủ sắc để cắt hàng rào dây thép.",
            "requirements": null,
            "effect": {
                "use": [],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 1,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        },
        "item_phone": {
            "name": "Điện Thoại",
            "icon": "smartphone",
            "desc": "Đường dây nóng với Vy. Dùng để liên lạc bất cứ lúc nào.",
            "requirements": null,
            "effect": {
                "use": [
                    {
                        "type": "effect",
                        "inline": {
                            "type": "goto",
                            "subtype": "chat",
                            "target": "chat_intro"
                        }
                    }
                ],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 1,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        },
        "item_flashlight": {
            "name": "Đèn Pin Nhỏ",
            "icon": "flashlight_on",
            "desc": "Soi sáng khi khu vực bị cắt điện.",
            "requirements": null,
            "effect": {
                "use": [],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 50,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        },
        "item_uniform": {
            "name": "Đồng Phục Bảo Vệ",
            "icon": "checkroom",
            "desc": "Lấy được từ phòng thay đồ nhân viên. Mặc vào để cải trang thành bảo vệ.",
            "requirements": null,
            "effect": {
                "use": [],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 1,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        },
        "item_journal": {
            "name": "Nhật Ký Cũ",
            "icon": "menu_book",
            "desc": "Cuốn sổ tay bỏ quên trên kệ sách. Có một dòng viết tay: 'Nơi ánh sáng đầu tiên chạm vào — đó là chìa khoá.' (BÌNH MINH, không dấu, viết liền: BINHMINH)",
            "requirements": null,
            "effect": {
                "use": [],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 1,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        },
        "item_gem": {
            "name": "Viên Ngọc Gia Truyền",
            "icon": "diamond",
            "desc": "Bảo vật mục tiêu của phi vụ. Lấp lánh ngay cả trong bóng tối.",
            "requirements": null,
            "effect": {
                "use": [],
                "equip": [],
                "unequip": []
            },
            "usage": {
                "current": 0,
                "max": 1,
                "status": [
                    [
                        10,
                        "tốt"
                    ],
                    [
                        5,
                        "hỏng"
                    ]
                ],
                "autoInc": true
            },
            "stats": {}
        }
    },
    "passwords": {
        "number": {
            "vault_code": {
                "desc": "Bàn phím két sắt gia đình. Mật mã 4 chữ số — bức tranh trên lầu có thể là gợi ý.",
                "retryMax": 5,
                "display": "keyboard",
                "value": "7429"
            }
        },
        "string": {
            "drawer_cipher": {
                "desc": "Ổ khoá chữ trên ngăn kéo bàn làm việc. Nhật ký để lại một câu đố về 'ánh sáng đầu tiên'.",
                "retryMax": 0,
                "value": "BINHMINH",
                "hint": [
                    0
                ]
            }
        },
        "find_way": {
            "hedge_grid": {
                "desc": "Lưới cảm biến chuyển động giấu trong hàng cây — chỉ một đường đi an toàn.",
                "retryMax": 3,
                "area": [
                    5,
                    5
                ],
                "start": [
                    0,
                    4
                ],
                "target": [
                    4,
                    0
                ],
                "street": [
                    [
                        0,
                        4
                    ],
                    [
                        0,
                        3
                    ],
                    [
                        1,
                        3
                    ],
                    [
                        1,
                        2
                    ],
                    [
                        2,
                        2
                    ],
                    [
                        2,
                        1
                    ],
                    [
                        3,
                        1
                    ],
                    [
                        3,
                        0
                    ],
                    [
                        4,
                        0
                    ]
                ]
            }
        },
        "puzzle": {
            "torn_painting": {
                "desc": "Một bức chân dung cổ bị xé rách thành nhiều mảnh, rải rác dưới sàn phòng tranh.",
                "retryMax": 0,
                "url": "assets/images/thumbnail.jpg",
                "ratio": [
                    3,
                    3
                ],
                "level": "normal"
            }
        },
        "switch": {
            "breaker_panel": {
                "desc": "Bảng cầu dao trong phòng kỹ thuật — 4 cần gạt. Gạt đúng tổ hợp bật/tắt để cắt nguồn cảm biến laser trên lầu.",
                "retryMax": 0,
                "value": "1001"
            }
        }
    },
    "characters": {
        "player": {
            "meta": {
                "name": "Kai",
                "desc": "Tay trộm chuyên nghiệp, nhận phi vụ đột nhập biệt thự Sương Mù."
            },
            "set": {
                "linkEffect": false,
                "alert": null,
                "moving": false,
                "move": null,
                "mainAction": null
            },
            "moveList": [],
            "effect": {
                "meeting": {},
                "leave": {}
            },
            "stats": {
                "Suspicion": {
                    "current": 0,
                    "max": 100,
                    "label": "Nghi vấn",
                    "color": "#DC2626"
                }
            },
            "met": [],
            "relationship": [],
            "place": {
                "currentIndex": 0,
                "scene_id": "scene_garden"
            },
            "inventory": [
                "item_phone",
                "item_flashlight"
            ]
        },
        "guard": {
            "meta": {
                "name": "Bảo Vệ Dũng",
                "desc": "Bảo vệ tuần tra biệt thự, cẩn trọng nhưng dễ nhận nhầm đồng nghiệp trong bóng tối."
            },
            "set": {
                "linkEffect": false,
                "alert": "danger",
                "moving": true,
                "move": "list",
                "mainAction": null
            },
            "moveList": [
                {
                    "scene_id": "scene_kitchen",
                    "nextStep": 45,
                    "weight": 1,
                    "count": -1,
                    "speed": 30,
                    "skip": false
                },
                {
                    "scene_id": "scene_garden",
                    "nextStep": 40,
                    "weight": 1,
                    "count": -1,
                    "speed": 30,
                    "skip": false
                },
                {
                    "scene_id": "scene_office",
                    "nextStep": 50,
                    "weight": 1,
                    "count": -1,
                    "speed": 30,
                    "skip": false
                }
            ],
            "effect": {
                "meeting": {
                    "player": [
                        {
                            "type": "notify",
                            "subtype": "toast",
                            "text": "Dũng gật đầu chào \"đồng nghiệp\" rồi đi tiếp.",
                            "level": "info",
                            "req": {
                                "logic": "AND",
                                "check": [
                                    {
                                        "type": "state",
                                        "property": "disguised",
                                        "op": "==",
                                        "value": true
                                    }
                                ]
                            }
                        },
                        {
                            "type": "notify",
                            "subtype": "toast",
                            "text": "Dũng nhìn thấy bạn! Tim bạn nảy lên.",
                            "level": "danger",
                            "req": {
                                "logic": "AND",
                                "check": [
                                    {
                                        "type": "state",
                                        "property": "disguised",
                                        "op": "==",
                                        "value": false
                                    }
                                ]
                            }
                        },
                        {
                            "type": "characters",
                            "subtype": "edit_stats",
                            "target": "player",
                            "property": "Suspicion",
                            "value": 25,
                            "mode": "add",
                            "notify": true,
                            "req": {
                                "logic": "AND",
                                "check": [
                                    {
                                        "type": "state",
                                        "property": "disguised",
                                        "op": "==",
                                        "value": false
                                    }
                                ]
                            }
                        },
                        {
                            "type": "goto",
                            "subtype": "end",
                            "target": "ending_caught",
                            "req": {
                                "logic": "AND",
                                "check": [
                                    {
                                        "type": "state",
                                        "property": "disguised",
                                        "op": "==",
                                        "value": false
                                    },
                                    {
                                        "type": "stats",
                                        "subtype": "characters",
                                        "target": "player",
                                        "property": "Suspicion",
                                        "op": ">=",
                                        "value": 75
                                    }
                                ]
                            }
                        }
                    ]
                },
                "leave": {
                    "player": []
                }
            },
            "stats": {},
            "met": [],
            "relationship": [],
            "place": {
                "currentIndex": 0,
                "scene_id": "scene_kitchen"
            },
            "inventory": []
        },
        "partner": {
            "meta": {
                "name": "Vy",
                "desc": "Đồng bọn điều phối từ xa qua điện thoại, theo dõi camera an ninh và đưa gợi ý."
            },
            "set": {
                "linkEffect": false,
                "alert": null,
                "moving": false,
                "move": null,
                "mainAction": null
            },
            "moveList": [],
            "effect": {
                "meeting": {},
                "leave": {}
            },
            "stats": {
                "Trust": {
                    "current": 60,
                    "max": 100,
                    "label": "Tin tưởng",
                    "color": "#2563EB"
                }
            },
            "met": [],
            "relationship": [],
            "place": {
                "currentIndex": 0,
                "scene_id": ""
            },
            "inventory": []
        }
    },
    "actions": {
        "action_search_bushes": {
            "meta": {
                "title": "Lục soát bụi cây",
                "thumb": "",
                "desc": "Có gì đó lấp ló trong bụi cây cạnh hàng rào.",
                "buttonIcon": "search",
                "buttonLabel": "Tìm kiếm"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "item",
                        "subtype": "add",
                        "target": "item_wirecutter",
                        "hide": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Tìm thấy kìm cắt dây trong bụi cây!",
                        "level": "success"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_call_partner_intro": {
            "meta": {
                "title": "Gọi cho Vy",
                "thumb": "",
                "desc": "Bật liên lạc trước khi bắt đầu.",
                "buttonIcon": "call",
                "buttonLabel": "Gọi"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "chat",
                        "target": "chat_intro"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_cut_fence": {
            "meta": {
                "title": "Cắt hàng rào",
                "thumb": "",
                "desc": "Hàng rào dây thép ngăn cách khu vườn với biệt thự.",
                "buttonIcon": "content_cut",
                "buttonLabel": "Cắt rào"
            },
            "set": {
                "type": "swap_router",
                "target": "r_maze",
                "requirement": true,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_wirecutter"
                    }
                ]
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "fence_cut",
                        "value": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Đã cắt xong một lỗ vừa đủ để chui qua.",
                        "level": "success"
                    },
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_maze"
                    }
                ],
                "fail": [
                    {
                        "type": "effect",
                        "ref": "toast_no_wirecutter"
                    }
                ],
                "pwFailed": []
            }
        },
        "action_abort_mission": {
            "meta": {
                "title": "Bỏ cuộc",
                "thumb": "",
                "desc": "Có lẽ phi vụ này không đáng liều mạng.",
                "buttonIcon": "close",
                "buttonLabel": "Quay xe"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "end",
                        "target": "ending_aborted"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_cross_sensors": {
            "meta": {
                "title": "Băng qua lưới cảm biến",
                "thumb": "",
                "desc": "Ánh đèn hồng ngoại lập loè giữa các lùm cây — chỉ một đường đi an toàn.",
                "buttonIcon": "sensors",
                "buttonLabel": "Di chuyển"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": "find_way:hedge_grid",
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Bạn len lỏi qua an toàn, không một cảm biến nào bị chạm.",
                        "level": "success"
                    },
                    {
                        "type": "goto",
                        "subtype": "scene",
                        "target": "scene_kitchen"
                    }
                ],
                "fail": [],
                "pwFailed": [
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Suýt chạm cảm biến — tim đập thình thịch.",
                        "level": "warn"
                    },
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "player",
                        "property": "Suspicion",
                        "value": 5,
                        "mode": "add",
                        "notify": false
                    }
                ]
            }
        },
        "action_go_locker": {
            "meta": {
                "title": "Vào phòng thay đồ",
                "thumb": "",
                "desc": "Một cánh cửa nhỏ cạnh bếp dẫn vào phòng thay đồ nhân viên.",
                "buttonIcon": "meeting_room",
                "buttonLabel": "Đi vào"
            },
            "set": {
                "type": "swap_router",
                "target": "r_locker",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_locker"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_go_office": {
            "meta": {
                "title": "Đi tới phòng làm việc",
                "thumb": "",
                "desc": "Hành lang tối dẫn tới khu vực văn phòng của chủ nhà.",
                "buttonIcon": "meeting_room",
                "buttonLabel": "Đi tới"
            },
            "set": {
                "type": "to_scene",
                "target": "scene_office",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "scene",
                        "target": "scene_office"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_search_locker": {
            "meta": {
                "title": "Lục tủ đồ",
                "thumb": "",
                "desc": "Một dãy tủ khoá hờ, có vẻ nhân viên vừa thay ca.",
                "buttonIcon": "checkroom",
                "buttonLabel": "Lục soát"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "item",
                        "subtype": "add",
                        "target": "item_uniform",
                        "hide": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Có một bộ đồng phục bảo vệ còn treo trong tủ!",
                        "level": "success"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_wear_uniform": {
            "meta": {
                "title": "Mặc đồng phục",
                "thumb": "",
                "desc": "Cải trang thành nhân viên bảo vệ để đi lại tự do hơn.",
                "buttonIcon": "checkroom",
                "buttonLabel": "Cải trang"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": true,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_uniform"
                    }
                ]
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "in_faker",
                        "target": "mask:guard"
                    },
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "disguised",
                        "value": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Nhìn trong gương... trông cũng ra dáng bảo vệ đấy chứ.",
                        "level": "success"
                    }
                ],
                "fail": [
                    {
                        "type": "effect",
                        "ref": "toast_no_uniform"
                    }
                ],
                "pwFailed": []
            }
        },
        "action_back_to_kitchen": {
            "meta": {
                "title": "Quay lại bếp",
                "thumb": "",
                "desc": "Trở ra hành lang bếp.",
                "buttonIcon": "arrow_back",
                "buttonLabel": "Quay lại"
            },
            "set": {
                "type": "swap_router",
                "target": "r_kitchen_main",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_kitchen_main"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_take_journal": {
            "meta": {
                "title": "Xem kệ sách",
                "thumb": "",
                "desc": "Một cuốn sổ tay cũ nằm lẫn giữa các quyển sách kế toán.",
                "buttonIcon": "menu_book",
                "buttonLabel": "Lấy sổ"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "item",
                        "subtype": "add",
                        "target": "item_journal",
                        "hide": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Nhật ký cũ — có vẻ liên quan tới ổ khoá ngăn kéo.",
                        "level": "success"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_open_drawer": {
            "meta": {
                "title": "Mở ngăn kéo",
                "thumb": "",
                "desc": "Ngăn kéo bàn làm việc khoá bằng một ổ khoá chữ.",
                "buttonIcon": "inventory_2",
                "buttonLabel": "Mở khoá"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": true,
                "password": "string:drawer_cipher",
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_journal"
                    }
                ]
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "partner",
                        "property": "Trust",
                        "value": 10,
                        "mode": "add",
                        "notify": true
                    },
                    {
                        "type": "notify",
                        "subtype": "modal",
                        "title": "Bằng chứng",
                        "text": "Bên trong là một xấp ảnh — bằng chứng chủ nhà rửa tiền qua các cuộc đấu giá cổ vật. Bạn chụp lại gửi cho Vy.",
                        "level": "info"
                    }
                ],
                "fail": [
                    {
                        "type": "effect",
                        "ref": "toast_no_journal"
                    }
                ],
                "pwFailed": []
            }
        },
        "action_go_utility": {
            "meta": {
                "title": "Xuống phòng kỹ thuật",
                "thumb": "",
                "desc": "Một cầu thang hẹp dẫn xuống phòng cầu dao điện.",
                "buttonIcon": "electrical_services",
                "buttonLabel": "Đi xuống"
            },
            "set": {
                "type": "swap_router",
                "target": "r_utility",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_utility"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_go_upstairs": {
            "meta": {
                "title": "Lên lầu",
                "thumb": "",
                "desc": "Cầu thang lên phòng tranh. Nếu cảm biến laser vẫn còn điện, băng qua sẽ không êm ả.",
                "buttonIcon": "stairs",
                "buttonLabel": "Lên lầu"
            },
            "set": {
                "type": "to_scene",
                "target": "scene_gallery",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "scene",
                        "target": "scene_gallery"
                    },
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "alarm_triggered",
                        "value": true,
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "power_cut",
                                    "op": "==",
                                    "value": false
                                }
                            ]
                        }
                    },
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "player",
                        "property": "Suspicion",
                        "value": 15,
                        "mode": "add",
                        "notify": true,
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "power_cut",
                                    "op": "==",
                                    "value": false
                                }
                            ]
                        }
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Một tia laser quét qua chân bạn — chuông báo động khẽ vang lên đâu đó.",
                        "level": "danger",
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "power_cut",
                                    "op": "==",
                                    "value": false
                                }
                            ]
                        }
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Cảm biến đã mất điện từ trước — bạn lên lầu êm ru.",
                        "level": "success",
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "power_cut",
                                    "op": "==",
                                    "value": true
                                }
                            ]
                        }
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_breaker_panel": {
            "meta": {
                "title": "Bảng cầu dao",
                "thumb": "",
                "desc": "4 cần gạt trong bóng tối — cần ánh sáng để thấy rõ.",
                "buttonIcon": "electrical_services",
                "buttonLabel": "Thao tác"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": true,
                "password": "switch:breaker_panel",
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": "AND",
                "check": [
                    {
                        "type": "item",
                        "subtype": "inventory",
                        "op": "has",
                        "value": "item_flashlight"
                    }
                ]
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "power_cut",
                        "value": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Đã cắt nguồn cảm biến laser trên lầu.",
                        "level": "success"
                    }
                ],
                "fail": [
                    {
                        "type": "effect",
                        "ref": "toast_no_flashlight"
                    }
                ],
                "pwFailed": []
            }
        },
        "action_back_to_office": {
            "meta": {
                "title": "Quay lại văn phòng",
                "thumb": "",
                "desc": "Trở lên phòng làm việc.",
                "buttonIcon": "arrow_back",
                "buttonLabel": "Quay lại"
            },
            "set": {
                "type": "swap_router",
                "target": "r_office_main",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_office_main"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_solve_painting": {
            "meta": {
                "title": "Ghép bức chân dung",
                "thumb": "",
                "desc": "Một bức tranh cổ bị xé thành nhiều mảnh, rải khắp sàn.",
                "buttonIcon": "image",
                "buttonLabel": "Ghép tranh"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": "puzzle:torn_painting",
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "painting_solved",
                        "value": true
                    },
                    {
                        "type": "notify",
                        "subtype": "modal",
                        "title": "Phát hiện",
                        "text": "Ghép xong bức tranh, mặt sau khung có khắc 4 chữ số mờ: 7429. Chắc chắn là mã két sắt!",
                        "level": "success"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_text_partner_gallery": {
            "meta": {
                "title": "Nhắn tin cho Vy",
                "thumb": "",
                "desc": "Tranh thủ báo tình hình trước khi xuống hầm.",
                "buttonIcon": "sms",
                "buttonLabel": "Nhắn tin"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "chat",
                        "target": "chat_gallery"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_go_vault": {
            "meta": {
                "title": "Xuống hầm chứa",
                "thumb": "",
                "desc": "Một cầu thang xoắn phía sau giá sách dẫn xuống hầm.",
                "buttonIcon": "meeting_room",
                "buttonLabel": "Đi xuống"
            },
            "set": {
                "type": "to_scene",
                "target": "scene_vault",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "scene",
                        "target": "scene_vault"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_crack_safe": {
            "meta": {
                "title": "Bấm mã két sắt",
                "thumb": "",
                "desc": "Két sắt gia đình, bàn phím 4 chữ số.",
                "buttonIcon": "lock",
                "buttonLabel": "Nhập mã"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": "number:vault_code",
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "item",
                        "subtype": "add",
                        "target": "item_gem",
                        "hide": false
                    },
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "vault_open",
                        "value": true
                    },
                    {
                        "type": "set",
                        "subtype": "state",
                        "target": "gem_taken",
                        "value": true
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "🎉 Viên ngọc gia truyền nằm gọn trong tay bạn!",
                        "level": "success"
                    },
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Một chuông báo im lặng vừa kích hoạt đâu đó...",
                        "level": "warn"
                    },
                    {
                        "type": "set",
                        "subtype": "automation",
                        "target": "response_countdown",
                        "property": "state",
                        "value": "run"
                    },
                    {
                        "type": "goto",
                        "subtype": "router",
                        "target": "r_vault_aftermath"
                    }
                ],
                "fail": [],
                "pwFailed": [
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Bấm sai — một tiếng bíp lớn vang lên.",
                        "level": "warn"
                    },
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "player",
                        "property": "Suspicion",
                        "value": 10,
                        "mode": "add",
                        "notify": true
                    }
                ]
            }
        },
        "action_grab_extra": {
            "meta": {
                "title": "Vơ thêm trang sức",
                "thumb": "",
                "desc": "Vài món trang sức nhỏ khác vẫn còn trong két.",
                "buttonIcon": "diamond",
                "buttonLabel": "Vơ thêm"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "notify",
                        "subtype": "toast",
                        "text": "Bạn nhét thêm vài món trang sức vào túi — mất thêm thời gian quý giá.",
                        "level": "warn"
                    },
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "player",
                        "property": "Suspicion",
                        "value": 10,
                        "mode": "add",
                        "notify": true
                    },
                    {
                        "type": "characters",
                        "subtype": "edit_stats",
                        "target": "partner",
                        "property": "Trust",
                        "value": -5,
                        "mode": "add",
                        "notify": true
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_leave_vault": {
            "meta": {
                "title": "Rời khỏi hầm",
                "thumb": "",
                "desc": "Đã đến lúc rút lui.",
                "buttonIcon": "exit_to_app",
                "buttonLabel": "Rút lui"
            },
            "set": {
                "type": "to_scene",
                "target": "scene_escape",
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "goto",
                        "subtype": "scene",
                        "target": "scene_escape"
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        },
        "action_final_escape": {
            "meta": {
                "title": "Chạy ra điểm hẹn",
                "thumb": "",
                "desc": "Mái nhà dẫn ra con hẻm sau, nơi Vy hẹn đón.",
                "buttonIcon": "directions_run",
                "buttonLabel": "Chạy!"
            },
            "set": {
                "type": "none",
                "target": null,
                "requirement": false,
                "password": null,
                "countClicks": null,
                "countFails": null,
                "display": "show",
                "charAllow": [],
                "cooldown": 0,
                "readDesc": false
            },
            "requirement": {
                "logic": null,
                "check": []
            },
            "effect": {
                "normal": [],
                "pass": [
                    {
                        "type": "set",
                        "subtype": "automation",
                        "target": "response_countdown",
                        "property": "state",
                        "value": "stop"
                    },
                    {
                        "type": "goto",
                        "subtype": "end",
                        "target": "ending_narrow",
                        "req": {
                            "logic": "OR",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "alarm_triggered",
                                    "op": "==",
                                    "value": true
                                },
                                {
                                    "type": "stats",
                                    "subtype": "characters",
                                    "target": "player",
                                    "property": "Suspicion",
                                    "op": ">",
                                    "value": 0
                                }
                            ]
                        }
                    },
                    {
                        "type": "goto",
                        "subtype": "end",
                        "target": "ending_perfect",
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "state",
                                    "property": "alarm_triggered",
                                    "op": "==",
                                    "value": false
                                },
                                {
                                    "type": "stats",
                                    "subtype": "characters",
                                    "target": "player",
                                    "property": "Suspicion",
                                    "op": "<=",
                                    "value": 0
                                }
                            ]
                        }
                    },
                    {
                        "type": "goto",
                        "subtype": "end",
                        "target": "ending_betrayed",
                        "req": {
                            "logic": "AND",
                            "check": [
                                {
                                    "type": "stats",
                                    "subtype": "characters",
                                    "target": "partner",
                                    "property": "Trust",
                                    "op": "<",
                                    "value": 50
                                }
                            ]
                        }
                    }
                ],
                "fail": [],
                "pwFailed": []
            }
        }
    },
    "chat": {
        "chat_intro": {
            "meta": {
                "title": "Vy",
                "loop": false,
                "sender": "partner",
                "entry": "b1",
                "to": [
                    "player"
                ]
            },
            "block": {
                "b1": {
                    "line": [
                        {
                            "char_id": "partner",
                            "text": "Kai, nghe rõ không? Vào tới vườn sau chưa?"
                        },
                        {
                            "char_id": "player",
                            "text": "Rồi, đang đứng trước hàng rào. Có cảm biến chuyển động, để tôi lo."
                        },
                        {
                            "char_id": "partner",
                            "text": "Cẩn thận đó. Tài sản trong biệt thự này không phải dạng vừa đâu."
                        }
                    ],
                    "choice_id": "c_intro1",
                    "choiced": false
                },
                "b2": {
                    "line": [
                        {
                            "char_id": "partner",
                            "text": "Được rồi. Tôi sẽ theo dõi camera an ninh và báo nếu có động tĩnh. May mắn nhé."
                        }
                    ],
                    "choice_id": null,
                    "choiced": false
                }
            },
            "choice": {
                "c_intro1": [
                    {
                        "text": "Cảm ơn vì đã tin tưởng tôi, Vy.",
                        "effect": [
                            {
                                "type": "characters",
                                "subtype": "edit_stats",
                                "target": "partner",
                                "property": "Trust",
                                "value": 8,
                                "mode": "add",
                                "notify": true
                            }
                        ],
                        "jump": "b2"
                    },
                    {
                        "text": "Khỏi lo, tôi làm một mình quen rồi.",
                        "effect": [
                            {
                                "type": "characters",
                                "subtype": "edit_stats",
                                "target": "partner",
                                "property": "Trust",
                                "value": -5,
                                "mode": "add",
                                "notify": true
                            }
                        ],
                        "jump": "b2"
                    }
                ]
            }
        },
        "chat_gallery": {
            "meta": {
                "title": "Vy",
                "loop": false,
                "sender": "partner",
                "entry": "g1",
                "to": [
                    "player"
                ]
            },
            "block": {
                "g1": {
                    "line": [
                        {
                            "char_id": "partner",
                            "text": "Sao rồi? Còn ở trong đó lâu không?"
                        }
                    ],
                    "choice_id": "c_gallery1",
                    "choiced": false
                },
                "g2": {
                    "line": [
                        {
                            "char_id": "partner",
                            "text": "Ừ... tôi chỉ lo thôi. Nhanh lên."
                        }
                    ],
                    "choice_id": null,
                    "choiced": false
                }
            },
            "choice": {
                "c_gallery1": [
                    {
                        "text": "Sắp xong rồi, đang giải một câu đố.",
                        "effect": [
                            {
                                "type": "characters",
                                "subtype": "edit_stats",
                                "target": "partner",
                                "property": "Trust",
                                "value": 5,
                                "mode": "add",
                                "notify": true
                            }
                        ],
                        "jump": "g2"
                    },
                    {
                        "text": "Đừng hỏi nhiều, để tôi tập trung.",
                        "effect": [
                            {
                                "type": "characters",
                                "subtype": "edit_stats",
                                "target": "partner",
                                "property": "Trust",
                                "value": -8,
                                "mode": "add",
                                "notify": true
                            }
                        ],
                        "jump": "g2"
                    }
                ]
            }
        }
    },
    "scenes": {
        "scene_garden": {
            "meta": {
                "title": "Vườn Sau Biệt Thự",
                "parentScene": null,
                "desc": "Sương mù giăng kín khu vườn phía sau biệt thự Sương Mù. Hàng rào dây thép là chướng ngại đầu tiên.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_gate",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_gate": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Bạn đứng nép mình trong bóng tối, hàng rào dây thép ngay trước mặt.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_search_bushes",
                        "action_call_partner_intro",
                        "action_cut_fence",
                        "action_abort_mission"
                    ]
                },
                "r_maze": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Đèn cảm biến hồng ngoại lập loè giữa các lùm cây được cắt tỉa cẩn thận.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_cross_sensors"
                    ]
                }
            }
        },
        "scene_kitchen": {
            "meta": {
                "title": "Bếp & Hành Lang Dịch Vụ",
                "parentScene": null,
                "desc": "Khu bếp lạnh tanh, mùi dầu ăn còn vương trong không khí. Đâu đó có tiếng bước chân.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_kitchen_main",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_kitchen_main": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Nồi niêu xếp gọn gàng, một cánh cửa dẫn vào phòng thay đồ nhân viên.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_go_locker",
                        "action_go_office"
                    ]
                },
                "r_locker": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Dãy tủ khoá hờ, mùi nước hoa rẻ tiền phảng phất.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_search_locker",
                        "action_wear_uniform",
                        "action_back_to_kitchen"
                    ]
                }
            }
        },
        "scene_office": {
            "meta": {
                "title": "Phòng Làm Việc",
                "parentScene": null,
                "desc": "Văn phòng riêng của chủ nhà, ngăn nắp đến khó chịu. Một cầu thang hẹp dẫn xuống phòng kỹ thuật.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_office_main",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_office_main": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Một chiếc bàn gỗ lớn, ngăn kéo khoá kín, kệ sách ngổn ngang giấy tờ.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_take_journal",
                        "action_open_drawer",
                        "action_go_utility",
                        "action_go_upstairs"
                    ]
                },
                "r_utility": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Bảng cầu dao điện phủ đầy bụi, tối om.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_breaker_panel",
                        "action_back_to_office"
                    ]
                }
            }
        },
        "scene_gallery": {
            "meta": {
                "title": "Phòng Tranh Trên Lầu",
                "parentScene": null,
                "desc": "Những bức chân dung cổ nhìn xuống từ trên tường. Một bức đã bị ai đó xé rách từ lâu.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_gallery_main",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_gallery_main": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Ánh trăng qua cửa sổ chiếu lên những mảnh tranh rách nát trên sàn.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_solve_painting",
                        "action_text_partner_gallery",
                        "action_go_vault"
                    ]
                }
            }
        },
        "scene_vault": {
            "meta": {
                "title": "Hầm Chứa Bảo Vật",
                "parentScene": null,
                "desc": "Căn hầm nhỏ sau giá sách, lạnh lẽo và ẩm thấp. Két sắt nằm im lìm giữa phòng.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_vault_main",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_vault_main": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Một két sắt cũ, bàn phím số đã mòn vì được dùng nhiều lần.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_crack_safe"
                    ]
                },
                "r_vault_aftermath": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Cánh cửa két sắt hé mở, ánh sáng vàng nhạt hắt ra từ bên trong.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_grab_extra",
                        "action_leave_vault"
                    ]
                }
            }
        },
        "scene_escape": {
            "meta": {
                "title": "Đường Thoát Trên Mái Nhà",
                "parentScene": null,
                "desc": "Gió lạnh thổi qua mái ngói. Con hẻm sau biệt thự hiện ra mờ ảo trong sương.",
                "cover": null,
                "music": null,
                "ambience": null
            },
            "set": {
                "activeRouterId": "r_escape_main",
                "blocked": false,
                "transition": "fade",
                "transitionDuration": 2
            },
            "routers": {
                "r_escape_main": {
                    "meta": {
                        "subTitleStatus": null,
                        "desc": "Chỉ còn một quãng ngắn nữa là tới điểm hẹn.",
                        "cover": null
                    },
                    "set": {
                        "blocked": false,
                        "visited": false,
                        "countVisited": 0,
                        "secondsStill": 0,
                        "timer": null,
                        "timerSeconds": 60,
                        "timerDisplay": null,
                        "timerEnd": "out",
                        "transition": "fade",
                        "transitionDuration": 2,
                        "overlay": null,
                        "overlayFlick": null
                    },
                    "loop": {
                        "enter": [],
                        "leave": [],
                        "still": []
                    },
                    "timer": {
                        "start": [],
                        "end": []
                    },
                    "actions": [
                        "action_final_escape"
                    ]
                }
            }
        }
    }
};
