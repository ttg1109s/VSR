// demo_script.js
// THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động
// Scenario format v1; Scene = physical space, Router = spatial state, Action = interaction/change.
export const DEMO_SCRIPT = {
  "formatVersion": 1,
  "meta": {
    "title": "THE SILENT VILLAGE — Ngôi Làng Không Tiếng Động",
    "subtitle": "Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại",
    "desc": "Bạn tỉnh dậy ở quảng trường của một ngôi làng bị mắc kẹt trong ký ức. Lần theo dấu vết qua giếng đá, nhà trọ, nhà nguyện, trường học, khu rừng, cối xay và đường hầm để tìm sân ga xuất hiện lúc 03:17; sự thật được ghép lại sẽ quyết định ai được giải thoát.",
    "writer": "VSR Demo Team",
    "studio": "VSR",
    "version": "2.0.0",
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
    "entryScene": "scene_village_square",
    "entryCharacter": "player",
    "createdAt": "2026-11-15T00:00:00.000Z",
    "updatedAt": "2026-11-16T00:00:00.000Z",
    "copyright": "Original demo scenario for VSR Engine",
    "license": "UNLICENSED",
    "notes": "Structural rewrite: every distinct physical location is a Scene; each Router represents a state/presentation of that space; Actions encode interaction, state changes and navigation."
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
    },
    "clue_well": {
      "type": "boolean",
      "value": false
    },
    "bell_rung": {
      "type": "boolean",
      "value": false
    },
    "clue_hymn": {
      "type": "boolean",
      "value": false
    },
    "clue_stakes": {
      "type": "boolean",
      "value": false
    },
    "evidence_broadcast": {
      "type": "boolean",
      "value": false
    },
    "evidence_well_badge": {
      "type": "boolean",
      "value": false
    },
    "evidence_hidden_room": {
      "type": "boolean",
      "value": false
    },
    "evidence_evacuation_film": {
      "type": "boolean",
      "value": false
    },
    "evidence_hymn_note": {
      "type": "boolean",
      "value": false
    },
    "evidence_bell_wire": {
      "type": "boolean",
      "value": false
    },
    "evidence_class_register": {
      "type": "boolean",
      "value": false
    },
    "evidence_forest_route": {
      "type": "boolean",
      "value": false
    },
    "evidence_evacuation_seal": {
      "type": "boolean",
      "value": false
    },
    "evidence_gear_pin": {
      "type": "boolean",
      "value": false
    },
    "evidence_tunnel_manifest": {
      "type": "boolean",
      "value": false
    },
    "evidence_station_ticket": {
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
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
            "property": "bell_rung",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "evacuation_seal"
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
    "automation": {}
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
    },
    "radio_crystal": {
      "name": "Cuộn tinh thể thu sóng",
      "icon": "radio",
      "desc": "Linh kiện lấy từ hộp loa, có thể dò lại tần số phát thanh.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_broadcast",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu cuộn tinh thể thu sóng với các manh mối đã thu thập."
          }
        ]
      }
    },
    "well_badge": {
      "name": "Phù hiệu đội sơ tán",
      "icon": "badge",
      "desc": "Phù hiệu kim loại có khắc ký hiệu của đội sơ tán năm ấy.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_well_badge",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu phù hiệu đội sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "spare_room_key": {
      "name": "Chìa khóa phòng thứ bảy",
      "icon": "key",
      "desc": "Chìa khóa đồng mở căn phòng bị xóa khỏi sơ đồ nhà trọ.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hidden_room",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu chìa khóa phòng thứ bảy với các manh mối đã thu thập."
          }
        ]
      }
    },
    "evacuation_film": {
      "name": "Cuộn phim sơ tán",
      "icon": "film",
      "desc": "Cuộn phim ghi lại đám đông ở bờ đê trong đêm mất tích.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_film",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu cuộn phim sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "hymn_note": {
      "name": "Trang ghi chú trong thánh ca",
      "icon": "scroll",
      "desc": "Mảnh giấy giải thích ý nghĩa của ba hồi chuông trong đêm sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hymn_note",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu trang ghi chú trong thánh ca với các manh mối đã thu thập."
          }
        ]
      }
    },
    "bell_copper_wire": {
      "name": "Dây đồng chuông",
      "icon": "cable",
      "desc": "Đoạn dây đồng dùng để nối lại cơ cấu truyền lực của chuông.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_bell_wire",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu dây đồng chuông với các manh mối đã thu thập."
          }
        ]
      }
    },
    "class_register_copy": {
      "name": "Bản sao sổ điểm danh",
      "icon": "book-open",
      "desc": "Bản ghi xác nhận có mười hai học sinh trong lớp vào ngày sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_class_register",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu bản sao sổ điểm danh với các manh mối đã thu thập."
          }
        ]
      }
    },
    "guide_compass": {
      "name": "La bàn người dẫn đường",
      "icon": "compass",
      "desc": "La bàn cũ có khắc tuyến đường từ rừng xuống chân đê.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_forest_route",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu la bàn người dẫn đường với các manh mối đã thu thập."
          }
        ]
      }
    },
    "evacuation_seal": {
      "name": "Con dấu đội sơ tán",
      "icon": "stamp",
      "desc": "Con dấu gỗ dùng để xác nhận danh sách sơ tán chính thức.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu con dấu đội sơ tán với các manh mối đã thu thập."
          }
        ]
      }
    },
    "mill_gear_pin": {
      "name": "Chốt truyền động",
      "icon": "settings",
      "desc": "Chốt kim loại thay thế cho bộ truyền động của cối xay nước.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_gear_pin",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu chốt truyền động với các manh mối đã thu thập."
          }
        ]
      }
    },
    "tunnel_manifest": {
      "name": "Danh sách vận chuyển",
      "icon": "file-text",
      "desc": "Danh sách ghi tên những người được đưa qua đường hầm trong đêm sơ tán.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_tunnel_manifest",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu danh sách vận chuyển với các manh mối đã thu thập."
          }
        ]
      }
    },
    "unpunched_ticket": {
      "name": "Vé tàu chưa xé",
      "icon": "ticket",
      "desc": "Vé của chuyến 03:17, còn nguyên phần kiểm soát.",
      "usage": {
        "current": 1,
        "max": 1,
        "autoInc": false
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_station_ticket",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đối chiếu vé tàu chưa xé với các manh mối đã thu thập."
          }
        ]
      }
    }
  },
  "passwords": {
    "number": {
      "pw_bell": {
        "desc": "Nhập thời điểm khắc trên mặt đồng hồ của tháp chuông.",
        "display": "keyboard",
        "value": "0417",
        "retryMax": 5
      }
    },
    "string": {
      "pw_guest": {
        "desc": "Mật từ ghép từ chữ cái đầu của bốn dòng trong bản thánh ca.",
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
        "desc": "Lần theo dãy ô liền kề được đánh dấu từ cổng rừng đến khoảng đất nghi lễ.",
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
    }
  },
  "scenes": {
    "scene_village_square": {
      "meta": {
        "title": "Quảng trường làng",
        "desc": "Không gian công cộng ở trung tâm làng; bảng thông báo và loa phát thanh là hai nguồn manh mối đầu tiên."
      },
      "set": {
        "activeRouterId": "router_square_fogbound"
      },
      "routers": {
        "router_square_fogbound": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Mù sương",
            "desc": "Sương phủ kín quảng trường, làm nhòe những dãy nhà quanh cổng làng. Chiếc loa phát thanh vẫn đều đặn gọi tên những người đã mất tích; bảng thông báo bên đường lưu lại danh sách dân làng với một cái tên bị cạo đi."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_notice",
            "action_talk_mai",
            "action_enter_well",
            "action_travel_inn",
            "action_travel_chapel",
            "action_travel_school",
            "action_travel_forest",
            "action_decode_broadcast"
          ]
        },
        "router_square_broadcast_decoded": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Đã giải mã",
            "desc": "Sau khi tháo nắp hộp loa, bạn tìm thấy cuộn dây đồng và sơ đồ tần số. Tiếng gọi tên dân làng không phải phát thanh trực tiếp mà là bản ghi được phát lặp theo chu kỳ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_notice",
            "action_talk_mai",
            "action_enter_well",
            "action_travel_inn",
            "action_travel_chapel",
            "action_travel_school",
            "action_travel_forest",
            "action_return_view_village_square"
          ]
        }
      }
    },
    "scene_village_well": {
      "meta": {
        "title": "Giếng đá",
        "desc": "Giếng nằm ngay rìa quảng trường, nơi dấu vết của người thứ mười hai bị che giấu.",
        "parentScene": "scene_village_square"
      },
      "set": {
        "activeRouterId": "router_well_echoes"
      },
      "routers": {
        "router_well_echoes": {
          "meta": {
            "sceneID": "scene_village_well",
            "subTitleStatus": "Có tiếng vọng",
            "desc": "Trong màn sương của quảng trường, tiếng gõ đều đặn vọng lên từ chiếc giếng đá phủ rêu. Trên thành giếng có bốn vạch khắc mới và một vết kim loại bị cào xước."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern",
            "action_return_square",
            "action_retrieve_well_badge"
          ]
        },
        "router_well_bottom_revealed": {
          "meta": {
            "sceneID": "scene_village_well",
            "subTitleStatus": "Dấu tích sơ tán",
            "desc": "Ánh đèn soi rõ một hốc nhỏ dưới mực nước cũ. Bên trong là phù hiệu kim loại của đội sơ tán, khớp với ký hiệu trên bản đồ làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern",
            "action_return_square",
            "action_return_view_village_well"
          ]
        }
      }
    },
    "scene_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "desc": "Nhà trọ là nơi lưu giữ sổ khách và lời khai về những người chưa thể rời làng."
      },
      "set": {
        "activeRouterId": "router_inn_unsettled"
      },
      "routers": {
        "router_inn_unsettled": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Bất an",
            "desc": "Mùi trà nguội quẩn quanh quầy lễ tân. Cuốn sổ khách ghi tên những người được cho là đã rời làng, nhưng trang cuối lại mang tên bạn với ngày đến là ngày mai."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_question_hanh",
            "action_open_guestbook",
            "action_return_square",
            "action_travel_chapel",
            "action_unlock_cellar",
            "action_find_spare_key"
          ]
        },
        "router_inn_hidden_room": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Phòng thứ bảy",
            "desc": "Sau quầy lễ tân có một ổ khóa nhỏ nối với hành lang. Chìa khóa dự phòng mở căn phòng không xuất hiện trong sơ đồ nhà trọ; bên trong chỉ còn một thẻ gửi đồ cũ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_question_hanh",
            "action_open_guestbook",
            "action_return_square",
            "action_travel_chapel",
            "action_unlock_cellar",
            "action_return_view_inn"
          ]
        }
      }
    },
    "scene_inn_cellar": {
      "meta": {
        "title": "Hầm rượu nhà trọ",
        "desc": "Căn hầm nằm dưới nhà trọ; cửa chỉ mở khi tìm được sổ khách và giải đúng mật từ trong thánh ca.",
        "parentScene": "scene_inn"
      },
      "set": {
        "activeRouterId": "router_cellar_open"
      },
      "routers": {
        "router_cellar_open": {
          "meta": {
            "sceneID": "scene_inn_cellar",
            "subTitleStatus": "Đã mở khóa",
            "desc": "Ổ khóa đã bật mở, để lộ cầu thang dẫn xuống căn hầm rượu tối và lạnh. Một cuộn băng ghi âm đêm mất điện được giấu sau chiếc thùng rỗng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar",
            "action_return_inn",
            "action_find_evacuation_film"
          ]
        },
        "router_cellar_recording_found": {
          "meta": {
            "sceneID": "scene_inn_cellar",
            "subTitleStatus": "Tìm thấy cuộn phim",
            "desc": "Phía sau kệ rượu có một máy chiếu cũ và cuộn phim chưa tráng. Những khung hình cho thấy người dân tập trung ở bờ đê trước thời điểm mất điện."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar",
            "action_return_inn",
            "action_return_view_inn_cellar"
          ]
        }
      }
    },
    "scene_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "desc": "Gian cầu nguyện lưu bản thánh ca chứa mật từ và lời giải về hồi chuông cuối."
      },
      "set": {
        "activeRouterId": "router_chapel_silent"
      },
      "routers": {
        "router_chapel_silent": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Im lặng",
            "desc": "Gian cầu nguyện chìm trong tĩnh lặng. Chuông đã ngừng ngân từ mười bảy năm trước, nhưng bản thánh ca còn lưu lại mật từ và chỉ dẫn về ba hồi chuông."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_hymn",
            "action_talk_keeper",
            "action_enter_tower",
            "action_return_square",
            "action_travel_school",
            "action_find_hymn_note"
          ]
        },
        "router_chapel_cryptic_note": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Lời nhắn bí mật",
            "desc": "Một trang giấy mỏng được khâu vào gáy sách. Nội dung xác nhận ba hồi chuông là tín hiệu kết thúc sơ tán, còn hồi thứ tư là lệnh ở lại."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_hymn",
            "action_talk_keeper",
            "action_enter_tower",
            "action_return_square",
            "action_travel_school",
            "action_return_view_chapel"
          ]
        }
      }
    },
    "scene_chapel_tower": {
      "meta": {
        "title": "Tháp chuông",
        "desc": "Tháp nằm phía trên nhà nguyện; mặt đồng hồ ghi thời điểm sự kiện và cơ cấu chuông bị tháo rời.",
        "parentScene": "scene_chapel"
      },
      "set": {
        "activeRouterId": "router_bell_chamber"
      },
      "routers": {
        "router_bell_chamber": {
          "meta": {
            "sceneID": "scene_chapel_tower",
            "subTitleStatus": "Chuông im lìm",
            "desc": "Trên tháp, quả chuông câm lặng treo phía trên mặt đồng hồ. Quả lắc đã bị tháo rời; mã khắc dưới mặt đồng hồ liên quan đến thời điểm những người dân biến mất."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_return_chapel",
            "action_recover_bell_wire"
          ]
        },
        "router_bell_mechanism_repaired": {
          "meta": {
            "sceneID": "scene_chapel_tower",
            "subTitleStatus": "Đã nối cơ cấu",
            "desc": "Một đoạn dây đồng còn cuộn quanh trục bánh răng. Sau khi lắp lại, cơ cấu truyền lực hoạt động nhưng chuông vẫn chỉ được rung khi quả lắc được tìm thấy."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_return_chapel",
            "action_return_view_chapel_tower"
          ]
        }
      }
    },
    "scene_abandoned_school": {
      "meta": {
        "title": "Trường tiểu học bỏ hoang",
        "desc": "Trường học lưu sơ đồ lớp và dấu vết về học sinh thứ mười hai bị xóa khỏi hồ sơ."
      },
      "set": {
        "activeRouterId": "router_classroom_erased"
      },
      "routers": {
        "router_classroom_erased": {
          "meta": {
            "sceneID": "scene_abandoned_school",
            "subTitleStatus": "Bị xóa tên",
            "desc": "Trong lớp học số 3, danh sách chỉ còn những cái tên bị gạch bỏ và bức ảnh tập thể bị xé. Sơ đồ chỗ ngồi có dấu vết của vị trí thứ mười hai, nhưng vị trí ấy đã bị xóa khỏi mọi bản sao."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_check_desk",
            "action_decode_roster",
            "action_return_square",
            "action_travel_forest",
            "action_recover_class_register"
          ]
        },
        "router_classroom_archive_open": {
          "meta": {
            "sceneID": "scene_abandoned_school",
            "subTitleStatus": "Đã khôi phục hồ sơ",
            "desc": "Một ngăn bàn bị đóng đinh chứa bản sao sổ điểm danh. Tên học sinh thứ mười hai vẫn bị bôi đen, nhưng số thứ tự và ngày nghỉ học trùng với hồ sơ sơ tán."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_check_desk",
            "action_decode_roster",
            "action_return_square",
            "action_travel_forest",
            "action_return_view_abandoned_school"
          ]
        }
      }
    },
    "scene_north_forest": {
      "meta": {
        "title": "Lối rừng phía Bắc",
        "desc": "Con đường xuyên rừng biến đổi, nhưng các dấu sơn giúp lần tới khu đất nghi lễ."
      },
      "set": {
        "activeRouterId": "router_forest_path_shifting"
      },
      "routers": {
        "router_forest_path_shifting": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Đường đi biến đổi",
            "desc": "Con đường mòn dưới tán thông không giữ nguyên hình dạng khi bạn quay lưng. Những vệt sơn trên thân cây là dấu hiệu hiếm hoi giúp xác định hướng đi tới khoảng đất trống."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_follow_marks",
            "action_maze_path",
            "action_enter_clearing",
            "action_return_square",
            "action_collect_forest_compass"
          ]
        },
        "router_forest_markers_aligned": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Dấu mốc đã khớp",
            "desc": "Khi đối chiếu vết sơn với hướng la bàn, bạn nhận ra các dấu mốc không chỉ dẫn đường trong rừng mà còn đánh dấu tuyến vận chuyển người xuống bờ đê."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_follow_marks",
            "action_maze_path",
            "action_enter_clearing",
            "action_return_square",
            "action_return_view_north_forest"
          ]
        }
      }
    },
    "scene_forest_clearing": {
      "meta": {
        "title": "Khoảng đất nghi lễ",
        "desc": "Khoảng đất trống giữa rừng có vòng cọc và chiếc hộp chôn chứa vật chứng.",
        "parentScene": "scene_north_forest"
      },
      "set": {
        "activeRouterId": "router_forest_clearing"
      },
      "routers": {
        "router_forest_clearing": {
          "meta": {
            "sceneID": "scene_forest_clearing",
            "subTitleStatus": "Bóng bị khuyết",
            "desc": "Mười hai cọc gỗ tạo thành một vòng cung giữa khoảng đất trống, nhưng chỉ có mười một chiếc bóng. Một chiếc hộp được chôn gần vòng cọc chứa những mảnh ảnh gia đình."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_return_forest",
            "action_travel_mill",
            "action_find_wooden_seal"
          ]
        },
        "router_clearing_ritual_trace": {
          "meta": {
            "sceneID": "scene_forest_clearing",
            "subTitleStatus": "Đã giải nghĩa",
            "desc": "Dưới phiến đá giữa vòng cọc là một con dấu gỗ. Nó không phải vật tế lễ mà là dấu xác nhận của đội sơ tán, được dùng để niêm phong danh sách người đã rời làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_return_forest",
            "action_travel_mill",
            "action_return_view_forest_clearing"
          ]
        }
      }
    },
    "scene_watermill": {
      "meta": {
        "title": "Cối xay nước",
        "desc": "Cối xay cũ là nút cơ giới dẫn xuống đường hầm dưới chân đê."
      },
      "set": {
        "activeRouterId": "router_watermill_stalled"
      },
      "routers": {
        "router_watermill_stalled": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Ngừng hoạt động",
            "desc": "Dòng suối đã cạn, bánh xe mục kẹt cứng trên trục. Bảng điều khiển còn nguyên; cần mảnh sơ đồ lấy từ trường học để xác định cách lắp lại cơ cấu truyền động."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_return_forest",
            "action_find_gear_pin"
          ]
        },
        "router_watermill_running": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Đang vận hành",
            "desc": "Bánh xe đã ăn khớp với trục truyền động. Dưới sàn, cửa sập rung lên theo nhịp máy và để lộ lối xuống đường hầm dưới chân đê."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_descend_tunnel",
            "action_return_forest"
          ]
        },
        "router_watermill_gear_inspected": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Lộ lỗi truyền động",
            "desc": "Khi tháo tấm che bánh răng, bạn tìm thấy chốt truyền động bị cong. Nó giải thích vì sao cối xay dừng lại; chốt phải được lắp đúng trước khi khởi động máy."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_return_forest",
            "action_return_view_watermill"
          ]
        }
      }
    },
    "scene_levee_tunnel": {
      "meta": {
        "title": "Đường hầm dưới chân đê",
        "desc": "Đường hầm ghi tên người mất tích và dẫn tới kho hồ sơ cùng sân ga bí mật.",
        "parentScene": "scene_watermill"
      },
      "set": {
        "activeRouterId": "router_tunnel_names"
      },
      "routers": {
        "router_tunnel_names": {
          "meta": {
            "sceneID": "scene_levee_tunnel",
            "subTitleStatus": "Tên bị khắc",
            "desc": "Những bức tường đường hầm ghi tên dân làng theo đúng thứ tự ngày họ biến mất. Danh sách có dấu hiệu bị sửa: số tên thực tế nhiều hơn những gì hồ sơ chính thức ghi nhận."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_enter_tunnel",
            "action_open_archive",
            "action_return_mill",
            "action_reach_station",
            "action_recover_tunnel_manifest"
          ]
        },
        "router_tunnel_manifest_found": {
          "meta": {
            "sceneID": "scene_levee_tunnel",
            "subTitleStatus": "Đã tìm danh sách",
            "desc": "Sau lớp gạch rỗng là một ống đựng tài liệu chống ẩm. Danh sách ghi rõ những người được đưa qua đường hầm và xác nhận ga tàu là điểm tập kết cuối cùng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_enter_tunnel",
            "action_open_archive",
            "action_return_mill",
            "action_reach_station",
            "action_return_view_levee_tunnel"
          ]
        }
      }
    },
    "scene_ghost_station": {
      "meta": {
        "title": "Ga tàu không có trên bản đồ",
        "desc": "Sân ga xuất hiện lúc 03:17; tại đây người chơi đối diện giọng nói và quyết định kết cục.",
        "parentScene": "scene_levee_tunnel"
      },
      "set": {
        "activeRouterId": "router_station_0317"
      },
      "routers": {
        "router_station_0317": {
          "meta": {
            "sceneID": "scene_ghost_station",
            "subTitleStatus": "Chuyến 03:17",
            "desc": "Sân ga không xuất hiện trên bất kỳ tấm bản đồ nào. Một chuyến tàu dừng lại lúc 03:17; giọng nói vang lên từ đường ray buộc bạn phải lựa chọn điều gì sẽ được giữ lại và điều gì phải chấm dứt."
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
            "action_confront_voice",
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_find_station_ticket"
          ]
        },
        "router_station_departure_records": {
          "meta": {
            "sceneID": "scene_ghost_station",
            "subTitleStatus": "Hồ sơ chuyến tàu",
            "desc": "Dưới ghế chờ là một vé tàu chưa xé và bản kê hành khách. Tấm vé xác nhận chuyến 03:17 từng tồn tại, nhưng không chứng minh rằng mọi người trên danh sách đã lên tàu."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_confront_voice",
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_return_view_ghost_station"
          ]
        }
      }
    }
  },
  "actions": {
    "action_read_notice": {
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
            "target": "action_read_notice",
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
    "action_talk_mai": {
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
    "action_inspect_well": {
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
            "target": "clue_well",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bốn vạch khắc là tọa độ của giếng trong bản đồ sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_well",
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
    "action_use_lantern": {
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
            "target": "action_use_lantern",
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
    "action_question_hanh": {
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
    "action_open_guestbook": {
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
            "target": "action_open_guestbook",
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
    "action_unlock_cellar": {
      "meta": {
        "title": "Mở khóa hầm",
        "desc": "Cần sổ khách, chìa khóa phòng thứ bảy và mật từ trong thánh ca để mở ổ khóa phụ dẫn xuống hầm."
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
            "subtype": "scene",
            "target": "scene_inn_cellar"
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guestbook"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_room_key"
          }
        ]
      }
    },
    "action_search_cellar": {
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
            "target": "action_search_cellar",
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
    "action_read_hymn": {
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
            "target": "clue_hymn",
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
            "target": "action_read_hymn",
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
    "action_talk_keeper": {
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
    "action_solve_bell": {
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
            "target": "action_solve_bell",
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
    "action_ring_bell": {
      "meta": {
        "title": "Rung chuông",
        "desc": "Lắp dây đồng nối lại cơ cấu, đặt quả lắc vào chuông và chỉ rung ba hồi theo ghi chú."
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
            "target": "bell_rung",
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
            "target": "action_ring_bell",
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "hymn_note"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_copper_wire"
          }
        ]
      }
    },
    "action_check_desk": {
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
            "target": "action_check_desk",
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
    "action_decode_roster": {
      "meta": {
        "title": "Đối chiếu sơ đồ chỗ ngồi",
        "desc": "Dùng bản sao sổ điểm danh để đối chiếu vị trí thứ mười hai đã bị xóa khỏi sơ đồ chỗ ngồi."
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
            "target": "action_decode_roster",
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
            "value": "class_register_copy"
          }
        ]
      }
    },
    "action_follow_marks": {
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
            "target": "action_follow_marks",
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
    "action_maze_path": {
      "meta": {
        "title": "Tìm đường qua rừng",
        "desc": "La bàn của người dẫn đường giúp xác định hướng thật khi lối mòn thay đổi."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "find_way:pw_forest",
        "requirement": true
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
            "target": "action_maze_path",
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
            "value": "guide_compass"
          }
        ]
      }
    },
    "action_inspect_stakes": {
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
            "target": "action_inspect_stakes",
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
    "action_find_hidden_box": {
      "meta": {
        "title": "Mở hộp chôn dưới đất",
        "desc": "Phù hiệu đội sơ tán có cùng ký hiệu với con dấu trên hộp chôn dưới đất; dùng nó để xác định đúng hộp."
      },
      "set": {
        "type": "none",
        "display": "show",
        "password": "puzzle:pw_photo",
        "requirement": true
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
            "target": "action_find_hidden_box",
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
            "value": "well_badge"
          }
        ]
      }
    },
    "action_repair_mill": {
      "meta": {
        "title": "Khởi động cối xay",
        "desc": "Lắp chốt truyền động tìm thấy trong hộp bánh răng, rồi dùng mảnh bản đồ để xoay bánh xe đúng chiều."
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
            "target": "action_repair_mill",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_running"
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "mill_gear_pin"
          }
        ]
      }
    },
    "action_enter_tunnel": {
      "meta": {
        "title": "Khám phá đường hầm",
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
            "target": "action_enter_tunnel",
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
    "action_open_archive": {
      "meta": {
        "title": "Mở kho hồ sơ",
        "desc": "Đối chiếu danh sách vận chuyển với cuộn phim sơ tán trước khi mở đúng ngăn hồ sơ."
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
            "target": "action_open_archive",
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "evacuation_film"
          }
        ]
      }
    },
    "action_confront_voice": {
      "meta": {
        "title": "Đối diện giọng nói",
        "desc": "Dò đúng tần số từ cuộn tinh thể thu sóng trước khi đối thoại với tín hiệu dưới ga."
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
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_crystal"
          }
        ]
      }
    },
    "action_choose_fate": {
      "meta": {
        "title": "Kết thúc: Giải thoát",
        "desc": "Chỉ có thể chọn giải thoát khi đã khôi phục đủ ký ức, rung chuông, mở hồ sơ và xác nhận danh sách bằng con dấu đội sơ tán."
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
    "action_ending_bury": {
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
    "action_ending_echo": {
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
    "action_ending_depart": {
      "meta": {
        "title": "Kết thúc: Lên chuyến tàu",
        "desc": "Bạn chỉ có thể chọn rời đi khi tìm được vé chưa xé của chuyến tàu 03:17."
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
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "unpunched_ticket"
          }
        ]
      }
    },
    "action_enter_well": {
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
            "subtype": "scene",
            "target": "scene_village_well"
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
    "action_return_square": {
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
            "target": "scene_village_square"
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
    "action_return_inn": {
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
    "action_enter_tower": {
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
            "subtype": "scene",
            "target": "scene_chapel_tower"
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
    "action_return_chapel": {
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
    "action_enter_clearing": {
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
            "subtype": "scene",
            "target": "scene_forest_clearing"
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
    "action_return_forest": {
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
            "subtype": "scene",
            "target": "scene_north_forest"
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
    "action_travel_inn": {
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
    "action_travel_chapel": {
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
    "action_travel_school": {
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
            "target": "scene_abandoned_school"
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
    "action_travel_forest": {
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
            "target": "scene_north_forest"
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
    "action_travel_mill": {
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
            "target": "scene_watermill"
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
    "action_return_mill": {
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
            "target": "scene_watermill"
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
    "action_reach_station": {
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
            "target": "scene_ghost_station"
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
    },
    "action_descend_tunnel": {
      "meta": {
        "title": "Mở cửa sập xuống đường hầm",
        "desc": "Bánh xe đã chạy, cơ cấu đối trọng nâng cửa sập dưới sàn cối xay."
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
            "text": "Cửa sập chỉ có thể mở khi bánh xe đã hoạt động."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_levee_tunnel"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Cơ cấu truyền động chưa hoạt động."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "mill_powered",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_decode_broadcast": {
      "meta": {
        "title": "Tháo hộp loa phát thanh",
        "desc": "Kiểm tra nguồn tín hiệu phía sau bảng thông báo."
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
            "text": "Kiểm tra nguồn tín hiệu phía sau bảng thông báo."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "radio_crystal"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_broadcast",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Cuộn tinh thể thu sóng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_decode_broadcast",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_square_broadcast_decoded"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_village_square": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_square_fogbound"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_retrieve_well_badge": {
      "meta": {
        "title": "Lấy phù hiệu dưới giếng",
        "desc": "Dùng móc sắt kéo vật kim loại mắc trong hốc đá."
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
            "text": "Dùng móc sắt kéo vật kim loại mắc trong hốc đá."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "well_badge"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_well_badge",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Phù hiệu đội sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_retrieve_well_badge",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_well_bottom_revealed"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_village_well": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_well_echoes"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_spare_key": {
      "meta": {
        "title": "Tìm chìa khóa phòng thứ bảy",
        "desc": "Kiểm tra ngăn kéo bị khóa sau quầy lễ tân."
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
            "text": "Kiểm tra ngăn kéo bị khóa sau quầy lễ tân."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "spare_room_key"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hidden_room",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Chìa khóa phòng thứ bảy."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_spare_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_hidden_room"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_inn": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_unsettled"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_evacuation_film": {
      "meta": {
        "title": "Lấy cuộn phim sơ tán",
        "desc": "Mở hộp thiếc sau kệ rượu và kiểm tra cuộn phim."
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
            "text": "Mở hộp thiếc sau kệ rượu và kiểm tra cuộn phim."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "evacuation_film"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_film",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Cuộn phim sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_evacuation_film",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_cellar_recording_found"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_inn_cellar": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_cellar_open"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_hymn_note": {
      "meta": {
        "title": "Tìm trang giấy khâu trong thánh ca",
        "desc": "Kiểm tra phần gáy sách đã bị khâu lại."
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
            "text": "Kiểm tra phần gáy sách đã bị khâu lại."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "hymn_note"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hymn_note",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Trang ghi chú trong thánh ca."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_hymn_note",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_chapel_cryptic_note"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_chapel": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_chapel_silent"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_recover_bell_wire": {
      "meta": {
        "title": "Thu hồi dây đồng của chuông",
        "desc": "Gỡ đoạn dây đồng mắc trong bánh răng."
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
            "text": "Gỡ đoạn dây đồng mắc trong bánh răng."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "bell_copper_wire"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_bell_wire",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Dây đồng chuông."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_bell_wire",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_bell_mechanism_repaired"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_chapel_tower": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_bell_chamber"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_recover_class_register": {
      "meta": {
        "title": "Lấy bản sao sổ điểm danh",
        "desc": "Cạy ngăn bàn bị đóng đinh ở cuối lớp."
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
            "text": "Cạy ngăn bàn bị đóng đinh ở cuối lớp."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "class_register_copy"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_class_register",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Bản sao sổ điểm danh."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_class_register",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_archive_open"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_abandoned_school": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_erased"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_collect_forest_compass": {
      "meta": {
        "title": "Nhặt la bàn của người dẫn đường",
        "desc": "Tìm vật dụng mắc dưới gốc cây có vết sơn kép."
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
            "text": "Tìm vật dụng mắc dưới gốc cây có vết sơn kép."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "guide_compass"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_forest_route",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: La bàn người dẫn đường."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_collect_forest_compass",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_markers_aligned"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_north_forest": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_path_shifting"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_wooden_seal": {
      "meta": {
        "title": "Lấy con dấu dưới phiến đá",
        "desc": "Nhấc phiến đá ở tâm vòng cọc và kiểm tra hốc bên dưới."
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
            "text": "Nhấc phiến đá ở tâm vòng cọc và kiểm tra hốc bên dưới."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "evacuation_seal"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Con dấu đội sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_wooden_seal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_clearing_ritual_trace"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_forest_clearing": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_forest_clearing"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_gear_pin": {
      "meta": {
        "title": "Tìm chốt truyền động",
        "desc": "Kiểm tra hộp bánh răng dưới sàn cối xay."
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
            "text": "Kiểm tra hộp bánh răng dưới sàn cối xay."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "mill_gear_pin"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_gear_pin",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Chốt truyền động."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_gear_pin",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_gear_inspected"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_watermill": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_stalled"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_recover_tunnel_manifest": {
      "meta": {
        "title": "Lấy danh sách vận chuyển",
        "desc": "Mở ống tài liệu giấu sau lớp gạch rỗng."
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
            "text": "Mở ống tài liệu giấu sau lớp gạch rỗng."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "tunnel_manifest"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_tunnel_manifest",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Danh sách vận chuyển."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_tunnel_manifest",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_tunnel_manifest_found"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_levee_tunnel": {
      "meta": {
        "title": "Trở lại góc nhìn ban đầu",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_tunnel_names"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
      }
    },
    "action_find_station_ticket": {
      "meta": {
        "title": "Tìm vé tàu chưa xé",
        "desc": "Kiểm tra khe dưới hàng ghế chờ."
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
            "text": "Kiểm tra khe dưới hàng ghế chờ."
          }
        ],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "unpunched_ticket"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_station_ticket",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn thu được: Vé tàu chưa xé."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_station_ticket",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_station_departure_records"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Bạn chưa thể kiểm tra manh mối này."
          }
        ]
      }
    },
    "action_return_view_ghost_station": {
      "meta": {
        "title": "Ga tàu ma — góc nhìn tổng thể",
        "buttonLabel": "Trở lại",
        "desc": "Quay lại trạng thái quan sát tổng thể của địa điểm."
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
            "text": "Bạn lùi lại để quan sát toàn bộ địa điểm."
          }
        ],
        "pass": [
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_station_0317"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warn",
            "text": "Không thể đổi góc nhìn lúc này."
          }
        ]
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
        "scene_id": "scene_village_square",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_village_square",
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
        "scene_id": "scene_abandoned_school",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_abandoned_school",
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
        "scene_id": "scene_ghost_station",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_ghost_station",
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
        20,
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
