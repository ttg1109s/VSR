// demo_script.js
// THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động
// Scenario format v1; gameplay progression and branching routes.
export const DEMO_SCRIPT = {
  "formatVersion": 1,
  "meta": {
    "title": "THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động",
    "subtitle": "Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại",
    "desc": "Bạn tỉnh dậy tại một ngôi làng phủ sương, nơi loa phát thanh gọi tên những người đã biến mất. Khám phá tám địa điểm, đối chiếu lời khai và quyết định liệu sự thật có nên được đánh thức.",
    "writer": "VSR Demo Team",
    "studio": "VSR",
    "version": "1.1.0",
    "language": "vi",
    "ageRating": "16+",
    "tags": [
      "mystery",
      "psychological-horror",
      "investigation",
      "puzzle"
    ],
    "difficulty": "normal",
    "estimatedPlayTime": 55,
    "entryScene": "scene_garden",
    "entryCharacter": "player",
    "createdAt": "2026-11-15T00:00:00.000Z",
    "updatedAt": "2026-11-15T00:00:00.000Z",
    "copyright": "Original demo scenario for VSR Engine",
    "license": "UNLICENSED",
    "notes": "Demo gameplay pass: interconnected scenes, branching dialogue, item progression, puzzle gates, clue economy and four conditional endings."
  },
  "globalStates": {
    "clue_lantern": {
      "type": "boolean",
      "value": false
    },
    "heard_bell": {
      "type": "boolean",
      "value": false
    },
    "found_guestbook": {
      "type": "boolean",
      "value": false
    },
    "knows_twelve": {
      "type": "boolean",
      "value": false
    },
    "trust_mai": {
      "type": "number",
      "value": 0
    },
    "truth_fragments": {
      "type": "number",
      "value": 0
    },
    "village_timer": {
      "type": "number",
      "value": 0
    },
    "final_choice": {
      "type": "string",
      "value": "undecided"
    },
    "clue_notice": {
      "type": "boolean",
      "value": false
    },
    "clue_tape": {
      "type": "boolean",
      "value": false
    },
    "clue_photo": {
      "type": "boolean",
      "value": false
    },
    "clue_roster": {
      "type": "boolean",
      "value": false
    },
    "clue_stakes": {
      "type": "boolean",
      "value": false
    },
    "cellar_open": {
      "type": "boolean",
      "value": false
    },
    "mill_powered": {
      "type": "boolean",
      "value": false
    },
    "archive_open": {
      "type": "boolean",
      "value": false
    },
    "voice_revealed": {
      "type": "boolean",
      "value": false
    },
    "clue_tunnel": {
      "type": "boolean",
      "value": false
    }
  },
  "templates": {
    "requirements": {
      "lantern_clue": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      },
      "enough_truth": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          }
        ]
      },
      "has_lantern_clue": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      },
      "has_guestbook": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "found_guestbook",
            "op": "==",
            "value": true
          }
        ]
      },
      "has_archive_key": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "archive_key"
          }
        ]
      },
      "station_ready": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          }
        ]
      },
      "release_ready": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "truth_fragments",
            "op": ">=",
            "value": 3
          },
          {
            "type": "state",
            "property": "heard_bell",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "effects": {
      "reveal_clue": [
        {
          "type": "notify",
          "subtype": "toast",
          "level": "success",
          "text": "Một mảnh ký ức vừa được khôi phục."
        }
      ],
      "warning": [
        {
          "type": "notify",
          "subtype": "toast",
          "level": "warn",
          "text": "Sương đang dày lên. Thời gian ở lại không còn nhiều."
        }
      ]
    },
    "automation": {
      "fog_cycle": {
        "set": {
          "move": "step_by_step",
          "moveDirection": "first",
          "numberCycleAllow": 3,
          "countCurrent": 0,
          "runInfinity": false,
          "banClick": false
        },
        "plan": [
          {
            "seconds": 20,
            "effect": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "warn",
                "text": "Sương phủ kín con đường phía Bắc."
              }
            ]
          },
          {
            "seconds": 20,
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "village_timer",
                "value": 1
              }
            ]
          },
          {
            "seconds": 20,
            "effect": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "danger",
                "text": "Loa phát thanh rè lên: 'Đừng trả lời khi nghe gọi tên'."
              }
            ]
          }
        ]
      }
    }
  },
  "itemInfo": {
    "lantern": {
      "name": "Đèn bão",
      "icon": "lantern",
      "desc": "Chiếu sáng những dấu vết chỉ xuất hiện trong sương.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_lantern",
            "value": true
          }
        ]
      }
    },
    "guestbook": {
      "name": "Sổ khách",
      "icon": "menu_book",
      "desc": "Cuốn sổ ghi lại những người chưa rời khỏi làng.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "found_guestbook",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những cái tên trong sổ không phải khách trọ. Đó là người chưa thể rời làng."
          }
        ]
      }
    },
    "tape": {
      "name": "Cuộn băng",
      "icon": "cassette",
      "desc": "Bản ghi âm đêm mất điện.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tape",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Giọng nói trong băng nhắc đến hồi chuông lúc 03:17."
          }
        ]
      }
    },
    "red_umbrella": {
      "name": "Ô đỏ",
      "icon": "umbrella",
      "desc": "Vật chứng xuất hiện trong lời kể của Mai.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mặt trong cán ô có khắc tên người thứ mười hai."
          }
        ]
      }
    },
    "bell_clapper": {
      "name": "Quả lắc chuông",
      "icon": "notifications",
      "desc": "Bộ phận bị tháo khỏi tháp chuông.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "heard_bell",
            "value": true
          }
        ]
      }
    },
    "class_photo": {
      "name": "Ảnh lớp",
      "icon": "photo",
      "desc": "Bức ảnh có một học sinh bị cắt khỏi khung.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          }
        ]
      }
    },
    "archive_key": {
      "name": "Chìa khóa kho hồ sơ",
      "icon": "key",
      "desc": "Chìa khóa mở tủ hồ sơ dưới đê.",
      "usage": {
        "current": 5,
        "max": 5,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          }
        ]
      }
    },
    "map_fragment": {
      "name": "Mảnh bản đồ",
      "icon": "map",
      "desc": "Mảnh giấy vẽ lối xuống đường hầm.",
      "usage": {
        "current": 10,
        "max": 10,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          }
        ]
      }
    }
  },
  "passwords": {
    "number": {
      "pw_bell": {
        "desc": "Mã thời điểm chuông ngừng ngân: bốn chữ số khắc dưới mặt đồng hồ.",
        "display": "keyboard",
        "value": "0417",
        "retryMax": 5
      }
    },
    "string": {
      "pw_guest": {
        "desc": "Từ khóa được tạo bởi chữ đầu của bốn dòng thánh ca.",
        "value": "IMLANG",
        "hint": [
          0,
          2
        ],
        "retryMax": 4
      }
    },
    "find_way": {
      "pw_forest": {
        "desc": "Tìm đường từ cổng rừng tới khoảng đất trống, chỉ đi theo các ô liền kề.",
        "area": [
          4,
          4
        ],
        "start": [
          0,
          0
        ],
        "target": [
          3,
          3
        ],
        "street": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            2,
            1
          ],
          [
            2,
            2
          ],
          [
            3,
            2
          ],
          [
            3,
            3
          ]
        ],
        "retryMax": 3
      }
    },
    "puzzle": {
      "pw_photo": {
        "desc": "Ghép lại bức ảnh gia đình bị xé.",
        "url": "assets/puzzles/silent-village-family.jpg",
        "ratio": [
          3,
          2
        ],
        "level": "normal",
        "retryMax": 3
      }
    },
    "switch": {
      "pw_switch": {
        "desc": "Đặt bốn công tắc theo thứ tự đèn trên sơ đồ lớp học.",
        "value": "1010",
        "retryMax": 4
      }
    }
  },
  "scenes": {
    "scene_garden": {
      "meta": {
        "title": "Quảng trường Mù Sương",
        "desc": "Trái tim của ngôi làng, nơi chiếc loa phát thanh vẫn gọi tên những người đã mất."
      },
      "set": {
        "activeRouterId": "square_gate"
      },
      "routers": {
        "square_gate": {
          "meta": {
            "sceneID": "scene_garden",
            "desc": "Cổng làng và bảng thông báo"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_read_notice",
            "act_talk_mai",
            "act_enter_well",
            "act_travel_inn",
            "act_travel_chapel",
            "act_travel_school",
            "act_travel_forest"
          ]
        },
        "square_well": {
          "meta": {
            "sceneID": "scene_garden",
            "desc": "Giếng đá phủ rêu, tiếng gõ vọng lên từ lòng giếng"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_inspect_well",
            "act_use_lantern",
            "act_return_square"
          ],
          "loop": {
            "enter": [
              {
                "type": "effect",
                "ref": "reveal_clue"
              }
            ]
          }
        }
      }
    },
    "scene_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "desc": "Mùi trà nguội và những căn phòng luôn được dọn sẵn cho khách chưa từng đến."
      },
      "set": {
        "activeRouterId": "inn_lobby"
      },
      "routers": {
        "inn_lobby": {
          "meta": {
            "sceneID": "scene_inn",
            "desc": "Quầy lễ tân"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_question_hanh",
            "act_open_guestbook",
            "act_return_square",
            "act_travel_chapel"
          ],
          "loop": {
            "still": [
              {
                "type": "effect",
                "ref": "warning"
              }
            ]
          }
        },
        "inn_cellar": {
          "meta": {
            "sceneID": "scene_inn",
            "desc": "Hầm rượu bị khóa"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_unlock_cellar",
            "act_search_cellar",
            "act_return_inn"
          ]
        }
      }
    },
    "scene_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "desc": "Chuông đã ngừng ngân từ mười bảy năm trước, nhưng mỗi đêm vẫn có người nghe thấy."
      },
      "set": {
        "activeRouterId": "chapel_nave"
      },
      "routers": {
        "chapel_nave": {
          "meta": {
            "sceneID": "scene_chapel",
            "desc": "Gian cầu nguyện"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_read_hymn",
            "act_talk_keeper",
            "act_enter_tower",
            "act_return_square",
            "act_travel_school"
          ]
        },
        "chapel_tower": {
          "meta": {
            "sceneID": "scene_chapel",
            "desc": "Tháp chuông"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_solve_bell",
            "act_ring_bell",
            "act_return_chapel"
          ],
          "loop": {}
        }
      }
    },
    "scene_school": {
      "meta": {
        "title": "Trường tiểu học bỏ hoang",
        "desc": "Bài tập trên bảng được viết bằng nét chữ của những đứa trẻ chưa từng tồn tại."
      },
      "set": {
        "activeRouterId": "school_class"
      },
      "routers": {
        "school_class": {
          "meta": {
            "sceneID": "scene_school",
            "desc": "Lớp học số 3"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_check_desk",
            "act_decode_roster",
            "act_return_square",
            "act_travel_forest"
          ]
        }
      }
    },
    "scene_forest": {
      "meta": {
        "title": "Rừng thông phía Bắc",
        "desc": "Con đường mòn thay đổi mỗi khi người chơi quay lưng."
      },
      "set": {
        "activeRouterId": "forest_path"
      },
      "routers": {
        "forest_path": {
          "meta": {
            "sceneID": "scene_forest",
            "desc": "Lối mòn dưới tán thông"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_follow_marks",
            "act_maze_path",
            "act_enter_clearing",
            "act_return_square"
          ],
          "loop": {}
        },
        "forest_clearing": {
          "meta": {
            "sceneID": "scene_forest",
            "desc": "Khoảng đất trống có những cọc gỗ"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_inspect_stakes",
            "act_find_hidden_box",
            "act_return_forest",
            "act_travel_mill"
          ]
        }
      }
    },
    "scene_mill": {
      "meta": {
        "title": "Cối xay nước",
        "desc": "Bánh xe vẫn quay dù dòng suối đã cạn từ lâu."
      },
      "set": {
        "activeRouterId": "mill_floor"
      },
      "routers": {
        "mill_floor": {
          "meta": {
            "sceneID": "scene_mill",
            "desc": "Sàn máy và bảng điều khiển"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_repair_mill",
            "act_set_switches",
            "act_return_forest"
          ]
        }
      }
    },
    "scene_tunnel": {
      "meta": {
        "title": "Đường hầm dưới chân đê",
        "desc": "Những bức tường ghi lại tên người dân theo thứ tự ngày họ biến mất."
      },
      "set": {
        "activeRouterId": "tunnel_entry"
      },
      "routers": {
        "tunnel_entry": {
          "meta": {
            "sceneID": "scene_tunnel",
            "desc": "Cửa hầm"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "act_enter_tunnel",
            "act_open_archive",
            "act_return_mill",
            "act_reach_station"
          ]
        }
      }
    },
    "scene_station": {
      "meta": {
        "title": "Ga tàu không có trên bản đồ",
        "desc": "Chuyến tàu cuối cùng chỉ dừng lại khi tất cả sự thật được gọi đúng tên."
      },
      "set": {
        "activeRouterId": "station_platform"
      },
      "routers": {
        "station_platform": {
          "meta": {
            "sceneID": "scene_station",
            "desc": "Sân ga lúc 03:17"
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0,
            "timer": true,
            "timerSeconds": 240,
            "timerEnd": "still"
          },
          "actions": [
            "act_confront_voice",
            "act_choose_fate",
            "act_ending_bury",
            "act_ending_echo",
            "act_ending_depart"
          ],
          "timer": {
            "end": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "warn",
                "text": "Tiếng còi tàu vang lên. Bạn đã bỏ lỡ cơ hội lựa chọn; chuyến tàu đưa bạn rời khỏi ngôi làng."
              },
              {
                "type": "goto",
                "subtype": "end",
                "target": "ending_depart"
              }
            ]
          },
          "loop": {
            "enter": [
              {
                "type": "set",
                "subtype": "state",
                "target": "final_choice",
                "value": "undecided"
              }
            ]
          }
        }
      }
    }
  },
  "actions": {
    "act_read_notice": {
      "meta": {
        "title": "Đọc bảng thông báo",
        "desc": "Danh sách dân làng có một cái tên bị cạo đi. Một chiếc đèn bão bị bỏ lại dưới chân bảng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Danh sách dân làng có một cái tên bị cạo đi. Một chiếc đèn bão bị bỏ lại dưới chân bảng."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_notice",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "lantern"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn nhặt được đèn bão. Ánh sáng của nó có thể làm lộ dấu vết trong sương."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_read_notice",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_talk_mai": {
      "meta": {
        "title": "Hỏi Mai về đêm mất điện",
        "desc": "Mai tránh nhìn về phía giếng. Hãy nghe lời kể của cô ấy."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mai tránh nhìn về phía giếng. Hãy nghe lời kể của cô ấy."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_inspect_well": {
      "meta": {
        "title": "Quan sát giếng",
        "desc": "Trên thành giếng có bốn vạch khắc mới và một vết kim loại bị cào xước."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Trên thành giếng có bốn vạch khắc mới và một vết kim loại bị cào xước."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_lantern",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bốn vạch khắc trùng với ký hiệu trên mặt đồng hồ nhà nguyện."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_inspect_well",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_use_lantern": {
      "meta": {
        "title": "Chiếu đèn xuống giếng",
        "desc": "Chỉ có thể đọc ký hiệu dưới đáy giếng khi manh mối ánh sáng đã được kích hoạt."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chỉ có thể đọc ký hiệu dưới đáy giếng khi manh mối ánh sáng đã được kích hoạt."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ánh sáng phản chiếu mã 0417 và một dòng chữ: 'đừng rung hồi thứ tư'."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_use_lantern",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "act_question_hanh": {
      "meta": {
        "title": "Hỏi bà Hạnh",
        "desc": "Bà Hạnh khẳng định nhà trọ chỉ có sáu phòng, dù hành lang có bảy cửa."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bà Hạnh khẳng định nhà trọ chỉ có sáu phòng, dù hành lang có bảy cửa."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_open_guestbook": {
      "meta": {
        "title": "Mở sổ khách",
        "desc": "Trang cuối ghi tên người chơi với ngày đến là ngày mai."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Trang cuối ghi tên người chơi với ngày đến là ngày mai."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "found_guestbook",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "guestbook"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn nhận được sổ khách. Trang cuối có dấu mực còn ướt."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_open_guestbook",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_unlock_cellar": {
      "meta": {
        "title": "Mở khóa hầm",
        "desc": "Ổ khóa cần chuỗi ký tự ẩn trong bản thánh ca và lời khai ở sổ khách."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "string:pw_guest",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Ổ khóa cần chuỗi ký tự ẩn trong bản thánh ca và lời khai ở sổ khách."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "cellar_open",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ổ khóa bật mở. Cầu thang dẫn xuống hầm rượu."
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "inn_cellar"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "found_guestbook",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "act_search_cellar": {
      "meta": {
        "title": "Lục tìm trong hầm",
        "desc": "Một cuộn băng được giấu sau thùng rỗng. Trên nhãn có ghi ngày sơ tán."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Một cuộn băng được giấu sau thùng rỗng. Trên nhãn có ghi ngày sơ tán."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tape",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "tape"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy cuộn băng ghi âm đêm mất điện."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_search_cellar",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_read_hymn": {
      "meta": {
        "title": "Đọc bản thánh ca",
        "desc": "Các chữ đầu dòng ghép thành từ 'IM LANG'. Một dòng bị gạch dưới nhắc đến ba hồi chuông."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Các chữ đầu dòng ghép thành từ 'IM LANG'. Một dòng bị gạch dưới nhắc đến ba hồi chuông."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn ghi nhớ mật từ IM LANG và quy tắc ba hồi chuông."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_read_hymn",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_talk_keeper": {
      "meta": {
        "title": "Nói chuyện với người giữ nhà nguyện",
        "desc": "Ông ta nói chuông chỉ được rung khi người giữ chuông chấp nhận sự thật."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Ông ta nói chuông chỉ được rung khi người giữ chuông chấp nhận sự thật."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_keeper"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_solve_bell": {
      "meta": {
        "title": "Giải mã mặt đồng hồ",
        "desc": "Mã bốn chữ số khắc dưới mặt đồng hồ là thời điểm mất tích."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "number:pw_bell"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mã bốn chữ số khắc dưới mặt đồng hồ là thời điểm mất tích."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "heard_bell",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "bell_clapper"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy quả lắc chuông bị tháo rời. Mã 0417 đã được xác nhận."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_solve_bell",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_ring_bell": {
      "meta": {
        "title": "Rung chuông",
        "desc": "Lắp quả lắc vào chuông và chỉ rung ba hồi."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Lắp quả lắc vào chuông và chỉ rung ba hồi."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "remove",
            "target": "bell_clapper"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "heard_bell",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ba hồi chuông xé màn sương. Những ký ức bị chôn vùi bắt đầu trở lại."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_ring_bell",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_clapper"
          },
          {
            "type": "state",
            "property": "heard_bell",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "act_check_desk": {
      "meta": {
        "title": "Kiểm tra ngăn bàn",
        "desc": "Có danh sách lớp với bốn học sinh bị gạch tên và một bức ảnh bị xé."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Có danh sách lớp với bốn học sinh bị gạch tên và một bức ảnh bị xé."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "class_photo"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy ảnh lớp bị xé và ghi chú về học sinh thứ mười hai."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_check_desk",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_decode_roster": {
      "meta": {
        "title": "Đối chiếu sơ đồ chỗ ngồi",
        "desc": "Sơ đồ cho thấy một chỗ ngồi thứ mười hai đã bị xóa khỏi mọi bản sao."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Sơ đồ cho thấy một chỗ ngồi thứ mười hai đã bị xóa khỏi mọi bản sao."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "map_fragment"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mảnh bản đồ chỉ tới cối xay nước phía Bắc."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_decode_roster",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_follow_marks": {
      "meta": {
        "title": "Lần theo dấu sơn",
        "desc": "Những vệt sơn dẫn tới khoảng đất trống, nơi các cọc gỗ tạo thành hình vòng cung."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những vệt sơn dẫn tới khoảng đất trống, nơi các cọc gỗ tạo thành hình vòng cung."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_stakes",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn xác định được hướng đi an toàn qua rừng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_follow_marks",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_maze_path": {
      "meta": {
        "title": "Tìm đường qua rừng",
        "desc": "Đi theo các ô liền kề từ cổng rừng tới khoảng đất trống."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "find_way:pw_forest"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Đi theo các ô liền kề từ cổng rừng tới khoảng đất trống."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "archive_key"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn vượt qua mê cung và nhặt được chìa khóa kho hồ sơ."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_maze_path",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_inspect_stakes": {
      "meta": {
        "title": "Đếm cọc gỗ",
        "desc": "Có mười hai cọc, nhưng chỉ mười một cái đổ bóng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Có mười hai cọc, nhưng chỉ mười một cái đổ bóng."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cọc thứ mười hai không có bóng vì nó đánh dấu vị trí của người bị xóa khỏi ký ức."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_inspect_stakes",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_find_hidden_box": {
      "meta": {
        "title": "Mở hộp chôn dưới đất",
        "desc": "Bức ảnh gia đình bị xé thành nhiều mảnh. Hãy ghép ảnh để nhận diện đứa trẻ."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "puzzle:pw_photo"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bức ảnh gia đình bị xé thành nhiều mảnh. Hãy ghép ảnh để nhận diện đứa trẻ."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "class_photo"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bức ảnh hoàn chỉnh cho thấy Linh đứng giữa những người đã mất tích."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_find_hidden_box",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_repair_mill": {
      "meta": {
        "title": "Khởi động cối xay",
        "desc": "Mảnh bản đồ cho thấy bánh xe cần được xoay ngược để mở cửa sập."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mảnh bản đồ cho thấy bánh xe cần được xoay ngược để mở cửa sập."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_powered",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cối xay dừng lại. Cửa sập dưới sàn mở ra lối xuống đường hầm."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_repair_mill",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_tunnel"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "map_fragment"
          }
        ]
      }
    },
    "act_set_switches": {
      "meta": {
        "title": "Gạt bảng công tắc",
        "desc": "Đặt bốn công tắc theo thứ tự đèn trên sơ đồ lớp học."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "switch:pw_switch"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Đặt bốn công tắc theo thứ tự đèn trên sơ đồ lớp học."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Các đèn chuyển sang màu trắng. Hệ thống khóa kho hồ sơ đã được ngắt."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_set_switches",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_enter_tunnel": {
      "meta": {
        "title": "Khám sát đường hầm",
        "desc": "Những bức tường ghi tên người dân theo thứ tự ngày họ biến mất."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những bức tường ghi tên người dân theo thứ tự ngày họ biến mất."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn phát hiện danh sách sơ tán bị sửa. Có mười hai cái tên, không phải mười một."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_enter_tunnel",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_open_archive": {
      "meta": {
        "title": "Mở kho hồ sơ",
        "desc": "Chìa khóa tìm thấy trong rừng khớp với ổ khóa tủ hồ sơ dưới đê."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chìa khóa tìm thấy trong rừng khớp với ổ khóa tủ hồ sơ dưới đê."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "truth_fragments",
            "value": 1
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Hồ sơ xác nhận ngôi làng đã bị sơ tán từ mười bảy năm trước."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "act_open_archive",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "archive_key"
          }
        ]
      }
    },
    "act_confront_voice": {
      "meta": {
        "title": "Đối diện giọng nói",
        "desc": "Giọng nói hỏi bạn muốn cứu người sống hay giữ lại ký ức."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Giọng nói hỏi bạn muốn cứu người sống hay giữ lại ký ức."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_voice"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_choose_fate": {
      "meta": {
        "title": "Kết thúc: Giải thoát",
        "desc": "Chỉ khi đã khôi phục đủ ký ức, nghe chuông và mở kho hồ sơ, bạn mới có thể trả sự thật về cho người sống."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chỉ khi đã khôi phục đủ ký ức, nghe chuông và mở kho hồ sơ, bạn mới có thể trả sự thật về cho người sống."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "release"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_release"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "ref": "release_ready"
      }
    },
    "act_ending_bury": {
      "meta": {
        "title": "Kết thúc: Chôn giấu",
        "desc": "Bạn có thể phá hủy hồ sơ và rời đi, giữ cho ngôi làng tiếp tục ngủ yên."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn có thể phá hủy hồ sơ và rời đi, giữ cho ngôi làng tiếp tục ngủ yên."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "bury"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_bury"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "type": "state",
        "property": "found_guestbook",
        "op": "==",
        "value": true
      }
    },
    "act_ending_echo": {
      "meta": {
        "title": "Kết thúc: Tiếng vọng thứ mười hai",
        "desc": "Chỉ có thể chọn ở lại khi đã biết danh tính người thứ mười hai và nghe được sự thật từ tín hiệu."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chỉ có thể chọn ở lại khi đã biết danh tính người thứ mười hai và nghe được sự thật từ tín hiệu."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "echo"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_echo"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "knows_twelve",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "voice_revealed",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "act_ending_depart": {
      "meta": {
        "title": "Kết thúc: Lên chuyến tàu",
        "desc": "Bạn có thể rời đi mà không giải quyết bí ẩn, nhưng sự thật sẽ tiếp tục bị bỏ lại."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn có thể rời đi mà không giải quyết bí ẩn, nhưng sự thật sẽ tiếp tục bị bỏ lại."
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "final_choice",
            "value": "depart"
          },
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_depart"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_enter_well": {
      "meta": {
        "title": "Đi tới giếng đá",
        "desc": "Rời quảng trường và tiếp cận giếng phủ rêu."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Rời quảng trường và tiếp cận giếng phủ rêu."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "square_well"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_return_square": {
      "meta": {
        "title": "Trở lại quảng trường",
        "desc": "Quay về quảng trường trung tâm."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Quay về quảng trường trung tâm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_garden"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_return_inn": {
      "meta": {
        "title": "Trở lại sảnh nhà trọ",
        "desc": "Rời hầm và quay về quầy lễ tân."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Rời hầm và quay về quầy lễ tân."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "inn_lobby"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_enter_tower": {
      "meta": {
        "title": "Lên tháp chuông",
        "desc": "Cầu thang hẹp dẫn lên nơi treo quả chuông câm."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Cầu thang hẹp dẫn lên nơi treo quả chuông câm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "chapel_tower"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_return_chapel": {
      "meta": {
        "title": "Trở lại gian nhà nguyện",
        "desc": "Quay về gian cầu nguyện."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Quay về gian cầu nguyện."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "chapel_nave"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_enter_clearing": {
      "meta": {
        "title": "Đi tới khoảng đất trống",
        "desc": "Theo dấu sơn đến vòng cọc gỗ giữa rừng."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Theo dấu sơn đến vòng cọc gỗ giữa rừng."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "forest_clearing"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_return_forest": {
      "meta": {
        "title": "Trở lại lối mòn",
        "desc": "Quay về con đường dưới tán thông."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Quay về con đường dưới tán thông."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "forest_path"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_travel_inn": {
      "meta": {
        "title": "Đi tới nhà trọ",
        "desc": "Theo con đường lát đá đến nhà trọ Bà Hạnh."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Theo con đường lát đá đến nhà trọ Bà Hạnh."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_inn"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_travel_chapel": {
      "meta": {
        "title": "Đi tới nhà nguyện",
        "desc": "Tiếng chuông im lặng dẫn bạn về phía nhà nguyện."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Tiếng chuông im lặng dẫn bạn về phía nhà nguyện."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_travel_school": {
      "meta": {
        "title": "Đi tới trường học",
        "desc": "Dấu chân nhỏ dẫn tới ngôi trường bỏ hoang."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Dấu chân nhỏ dẫn tới ngôi trường bỏ hoang."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_school"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_travel_forest": {
      "meta": {
        "title": "Đi tới rừng thông",
        "desc": "Con đường phía Bắc mở ra dưới màn sương."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Con đường phía Bắc mở ra dưới màn sương."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_forest"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_travel_mill": {
      "meta": {
        "title": "Đi tới cối xay nước",
        "desc": "Theo con suối cạn tới cối xay cũ."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Theo con suối cạn tới cối xay cũ."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_mill"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_return_mill": {
      "meta": {
        "title": "Trở lại cối xay",
        "desc": "Quay lại căn phòng máy dưới chân đê."
      },
      "set": {
        "type": "none",
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Quay lại căn phòng máy dưới chân đê."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_mill"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      }
    },
    "act_reach_station": {
      "meta": {
        "title": "Đi tới ga tàu",
        "desc": "Chỉ những người đã ghép đủ manh mối mới tìm thấy sân ga."
      },
      "set": {
        "type": "none",
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Chỉ những người đã ghép đủ manh mối mới tìm thấy sân ga."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_station"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa đáp ứng điều kiện để thực hiện việc này."
          }
        ]
      },
      "requirement": {
        "ref": "station_ready"
      }
    }
  },
  "chat": {
    "chat_mai": {
      "meta": {
        "title": "Mai — Quảng trường",
        "loop": false,
        "sender": "mai",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu nghe loa gọi tên mình, đừng trả lời."
            },
            {
              "char_id": "mai",
              "text": "Đêm đó có mười hai người biến mất. Sáng hôm sau, mọi người chỉ nhớ mười một."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "truth": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi đã nhìn thấy người thứ mười hai đi xuống giếng. Nhưng đó là tôi."
            }
          ],
          "choiced": false
        },
        "silence": {
          "line": [
            {
              "char_id": "mai",
              "text": "Có những chuyện nếu nói ra sẽ khiến làng nhớ lại."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "mai_truth",
            "text": "Hỏi về người thứ mười hai",
            "jump": "truth",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "trust_mai",
                "value": 1
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "knows_twelve",
                "value": true
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "item",
                "subtype": "add",
                "target": "red_umbrella"
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Mai trao chiếc ô đỏ. Bên trong cán ô có khắc tên người thứ mười hai."
              }
            ]
          },
          {
            "id": "mai_silence",
            "text": "Không ép cô ấy",
            "jump": "silence",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "trust_mai",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Mai tin bạn đủ để không rời khỏi quảng trường."
              }
            ]
          }
        ]
      }
    },
    "chat_hanh": {
      "meta": {
        "title": "Bà Hạnh — Nhà trọ",
        "loop": false,
        "sender": "hanh",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Phòng của cậu đã được chuẩn bị từ trước."
            },
            {
              "char_id": "hanh",
              "text": "Tôi không nhớ ai đã đặt phòng."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "answer": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Sổ khách không ghi người đến. Nó ghi người chưa rời đi."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "ask_book",
            "text": "Hỏi về cuốn sổ",
            "jump": "answer",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "found_guestbook",
                "value": true
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Bà Hạnh xác nhận cuốn sổ ghi những người chưa thể rời làng."
              }
            ]
          }
        ]
      }
    },
    "chat_keeper": {
      "meta": {
        "title": "Người giữ nhà nguyện",
        "loop": false,
        "sender": "keeper",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Chuông không gọi người chết. Nó gọi những người còn nhớ."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "answer": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Nếu chuông ngân ba hồi, ký ức sẽ trở lại. Nếu ngân bốn hồi, ngôi làng sẽ biến mất."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "keeper_why",
            "text": "Hỏi vì sao ông ở lại",
            "jump": "answer",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Người giữ nhà nguyện tiết lộ: ba hồi chuông gọi ký ức, hồi thứ tư xóa ngôi làng."
              }
            ]
          }
        ]
      }
    },
    "chat_voice": {
      "meta": {
        "title": "Tín hiệu ga tàu",
        "loop": false,
        "sender": "voice",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "voice",
              "text": "Cậu đã đến muộn mười bảy năm."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "reveal": {
          "line": [
            {
              "char_id": "voice",
              "text": "Ngôi làng là ký ức tập thể của những người không chấp nhận cuộc sơ tán."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "voice_truth",
            "text": "Hỏi sự thật",
            "jump": "reveal",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "voice_revealed",
                "value": true
              },
              {
                "type": "set",
                "subtype": "state",
                "target": "truth_fragments",
                "value": 1
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Tín hiệu xác nhận ngôi làng là ký ức tập thể của những người không chấp nhận cuộc sơ tán."
              }
            ]
          }
        ]
      }
    }
  },
  "characters": {
    "mai": {
      "meta": {
        "name": "Mai",
        "desc": "Người bán hàng trẻ, luôn tránh nhìn về phía giếng."
      },
      "set": {
        "linkEffect": false,
        "alert": "warning",
        "moving": false,
        "move": null
      },
      "stats": {
        "trust": {
          "current": 0,
          "max": 5,
          "label": "Tin tưởng"
        },
        "fear": {
          "current": 2,
          "max": 5,
          "label": "Sợ hãi"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_garden",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_garden",
          "nextStep": 30
        }
      ]
    },
    "hanh": {
      "meta": {
        "name": "Bà Hạnh",
        "desc": "Chủ nhà trọ, nhớ mọi vị khách nhưng phủ nhận từng gặp bạn."
      },
      "set": {
        "linkEffect": false,
        "alert": null,
        "moving": false,
        "move": null
      },
      "stats": {
        "trust": {
          "current": 1,
          "max": 5,
          "label": "Tin tưởng"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_inn",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_inn",
          "nextStep": 45
        }
      ]
    },
    "keeper": {
      "meta": {
        "name": "Người giữ nhà nguyện",
        "desc": "Một người đàn ông không có bóng dưới ánh nến."
      },
      "set": {
        "linkEffect": false,
        "alert": "danger",
        "moving": false,
        "move": null
      },
      "stats": {
        "faith": {
          "current": 3,
          "max": 5,
          "label": "Đức tin"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_chapel",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_chapel",
          "nextStep": 60
        }
      ]
    },
    "linh": {
      "meta": {
        "name": "Linh",
        "desc": "Đứa trẻ trong bức ảnh cũ, xuất hiện ở nơi không có ai."
      },
      "set": {
        "linkEffect": false,
        "alert": "notice",
        "moving": false,
        "move": null
      },
      "stats": {
        "memory": {
          "current": 1,
          "max": 5,
          "label": "Ký ức"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_school",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_school",
          "nextStep": 35
        }
      ]
    },
    "voice": {
      "meta": {
        "name": "Giọng nói dưới ga",
        "desc": "Không rõ là người thân, người lạ hay chính bạn."
      },
      "set": {
        "linkEffect": false,
        "alert": "danger",
        "moving": false,
        "move": null
      },
      "stats": {
        "echo": {
          "current": 4,
          "max": 5,
          "label": "Dư âm"
        }
      },
      "inventory": [],
      "place": {
        "scene_id": "scene_station",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_station",
          "nextStep": 50
        }
      ]
    }
  },
  "endings": {
    "ending_release": {
      "title": "Hồi Chuông Cuối Cùng",
      "desc": "Bạn gọi đúng tên mười hai người và rung chuông ba hồi. Ký ức được trả về cho những người còn sống; ngôi làng tan vào sương, nhưng lần đầu tiên không ai bị lãng quên."
    },
    "ending_bury": {
      "title": "Ngôi Làng Ngủ Yên",
      "desc": "Bạn phá hủy hồ sơ và rời đi. Ngôi làng tiếp tục tồn tại trong im lặng, còn sự thật bị chôn thêm một thế hệ."
    },
    "ending_echo": {
      "title": "Tiếng Vọng Thứ Mười Hai",
      "desc": "Bạn trả lời tiếng loa. Ngôi làng nhận ra bạn là mảnh ký ức bị thiếu và giữ bạn lại để lấp đầy chỗ trống."
    },
    "ending_depart": {
      "title": "Chuyến Tàu Lúc 03:17",
      "desc": "Bạn lên tàu mà không chọn phe. Tàu rời ga, nhưng trong cửa kính phản chiếu vẫn có một người đứng sau lưng bạn."
    }
  },
  "config": {
    "fakerMode": "soul",
    "minTransition": 1,
    "minAutomationNextStep": 2,
    "maxCharacterMoving": 5,
    "maxInventory": [
      [
        8,
        "player"
      ]
    ],
    "maxHandOn": 2,
    "brokenDisable": false,
    "minCharacterMoving": 30,
    "stopEffectWhenChat": false,
    "navContact": true,
    "navInventory": true,
    "defaultNotice": true,
    "allDescRead": false,
    "clickHintDesc": 2
  }
};
