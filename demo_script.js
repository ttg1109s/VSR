{
  "formatVersion": 1,
  "meta": {
    "title": "NGÔI LÀNG KHÔNG TIẾNG ĐỘNG",
    "subtitle": "Một bí ẩn dân gian về ký ức, sự mất tích và cái giá của việc nhớ lại",
    "desc": "Bạn tỉnh dậy giữa màn đêm của một ngôi làng bị mắc kẹt trong ký ức. Sương mù che khuất những con đường và tiếng loa rè rè vọng ra từ quảng trường. Hãy lần theo dấu vết qua các địa điểm trong làng — từ giếng đá, nhà trọ, nhà nguyện, trường học đến khu rừng, cối xay và đường hầm — để tìm sân ga xuất hiện lúc 03:17; sự thật được ghép lại sẽ quyết định ai được giải thoát.",
    "writer": "Nhóm phát triển bản demo VSR",
    "studio": "VSR",
    "version": "2.1.1",
    "language": "vi",
    "ageRating": "16+",
    "tags": [
      "Bí ẩn",
      "Kinh dị tâm lý",
      "Điều tra",
      "Giải đố"
    ],
    "difficulty": "normal",
    "estimatedPlayTime": 55,
    "entryScene": "scene_village",
    "entryCharacter": "player",
    "createdAt": "2026-11-15T00:00:00.000Z",
    "updatedAt": "2026-11-20T00:00:00.000Z",
    "copyright": "Kịch bản demo gốc dành cho VSR Engine",
    "license": "Chưa cấp phép",
    "notes": "Schema remediation: Router metadata normalized; recursive AND/OR requirements supported for endings while preserving single Actions; invalid player stat subtype corrected; missing bell state declared. Schema and runtime validation verified; recursive and flat requirement tests pass. Item-condition audit: evacuation_seal damage is now derived from item.usage; unused damage flags radio_toolkit_damaged, compass_damaged and bell_wire_damaged removed. Lantern and Room 7 key damage flags retained because usage does not uniquely encode their event semantics."
  },
  "globalStates": {
    "clue_lantern": {
      "type": "boolean",
      "value": false,
      "title": "Đã soi dấu bằng đèn bão"
    },
    "heard_bell": {
      "type": "boolean",
      "value": false,
      "title": "Đã nghe tiếng chuông"
    },
    "found_guestbook": {
      "type": "boolean",
      "value": false,
      "title": "Tìm thấy sổ khách"
    },
    "knows_twelve": {
      "type": "boolean",
      "value": false,
      "title": "Biết con số mười hai"
    },
    "school_choice": {
      "type": "string",
      "value": "chưa quyết định",
      "title": "Lựa chọn trường học"
    },
    "clue_village_notice": {
      "type": "boolean",
      "value": false,
      "title": "Thông báo làng"
    },
    "clue_tape": {
      "type": "boolean",
      "value": false,
      "title": "Cuộn băng"
    },
    "clue_photo": {
      "type": "boolean",
      "value": false,
      "title": "Bức ảnh"
    },
    "clue_roster": {
      "type": "boolean",
      "value": false,
      "title": "Danh sách lớp"
    },
    "clue_seat_mark": {
      "type": "boolean",
      "value": false,
      "title": "Dấu trên ghế"
    },
    "clue_class_clock": {
      "type": "boolean",
      "value": false,
      "title": "Đồng hồ lớp"
    },
    "mill_powered": {
      "type": "boolean",
      "value": false,
      "title": "Nhà máy có điện"
    },
    "archive_open": {
      "type": "boolean",
      "value": false,
      "title": "Kho lưu trữ mở"
    },
    "voice_revealed": {
      "type": "boolean",
      "value": false,
      "title": "Giọng nói được hé lộ"
    },
    "clue_tunnel": {
      "type": "boolean",
      "value": false,
      "title": "Manh mối đường hầm"
    },
    "clue_well": {
      "type": "boolean",
      "value": false,
      "title": "Manh mối giếng"
    },
    "bell_rung": {
      "type": "boolean",
      "value": false,
      "title": "Chuông đã rung"
    },
    "clue_hymn": {
      "type": "boolean",
      "value": false,
      "title": "Bài thánh ca"
    },
    "clue_stakes": {
      "type": "boolean",
      "value": false,
      "title": "Các cọc gỗ"
    },
    "evidence_hidden_room": {
      "type": "boolean",
      "value": false,
      "title": "Bằng chứng phòng kín"
    },
    "evidence_evacuation_film": {
      "type": "boolean",
      "value": false,
      "title": "Phim sơ tán"
    },
    "evidence_evacuation_seal": {
      "type": "boolean",
      "value": false,
      "title": "Con dấu sơ tán"
    },
    "room7_confirmed": {
      "type": "boolean",
      "value": false,
      "title": "Xác nhận phòng 7"
    },
    "room7_lock_damaged": {
      "type": "boolean",
      "value": false,
      "title": "Khóa phòng 7 hỏng"
    },
    "room7_key_damaged": {
      "type": "boolean",
      "value": false,
      "title": "Chìa khóa phòng 7 hư"
    },
    "room7_key_broken": {
      "type": "boolean",
      "value": false,
      "title": "Chìa khóa phòng 7 gãy"
    },
    "player_panicked": {
      "type": "boolean",
      "value": false,
      "title": "Người chơi hoảng loạn"
    },
    "memory_reconstructed": {
      "type": "boolean",
      "value": false,
      "title": "Ký ức tái dựng"
    },
    "radio_damaged": {
      "type": "boolean",
      "value": false,
      "title": "Radio hư hại"
    },
    "map_incomplete": {
      "type": "boolean",
      "value": false,
      "title": "Bản đồ chưa hoàn chỉnh"
    },
    "mill_repaired_partial": {
      "type": "boolean",
      "value": false,
      "title": "Nhà máy sửa chữa một phần"
    },
    "bell_rung_imperfectly": {
      "type": "boolean",
      "value": false,
      "title": "Chuông rung không hoàn chỉnh"
    },
    "bell_signal_distorted": {
      "type": "boolean",
      "value": false,
      "title": "Tín hiệu chuông méo"
    },
    "archive_partial": {
      "type": "boolean",
      "value": false,
      "title": "Kho lưu trữ mở một phần"
    },
    "mai_approach": {
      "type": "string",
      "value": "chưa tiếp cận",
      "title": "Cách tiếp cận Mai"
    },
    "clue_mai_observation": {
      "type": "boolean",
      "value": false,
      "title": "Dấu hiệu quan sát Mai"
    },
    "forest_route_partial": {
      "type": "boolean",
      "value": false,
      "title": "Đường rừng chưa hoàn chỉnh"
    },
    "radio_signal_partial": {
      "type": "boolean",
      "value": false,
      "title": "Tín hiệu radio yếu"
    },
    "identity_verified_partial": {
      "type": "boolean",
      "value": false,
      "title": "Danh tính xác minh một phần"
    },
    "ticket_verified": {
      "type": "boolean",
      "value": false,
      "title": "Vé đã xác minh"
    },
    "evidence_verified": {
      "type": "boolean",
      "value": false,
      "title": "Bằng chứng đã xác minh"
    },
    "memory_reward_tunnel": {
      "type": "boolean",
      "value": false,
      "title": "Ký ức phần thưởng đường hầm"
    },
    "guestbook_partial": {
      "type": "boolean",
      "value": false,
      "title": "Sổ khách chưa hoàn chỉnh"
    },
    "hymn_partial": {
      "type": "boolean",
      "value": false,
      "title": "Thánh ca chưa hoàn chỉnh"
    },
    "manifest_partial": {
      "type": "boolean",
      "value": false,
      "title": "Danh sách vận chuyển chưa hoàn chỉnh"
    },
    "clue_tunnel_partial": {
      "type": "boolean",
      "value": false,
      "title": "Manh mối đường hầm chưa đủ"
    },
    "clue_roster_verified": {
      "type": "boolean",
      "value": false,
      "title": "Danh sách lớp đã xác minh"
    },
    "corroboration_transport_records": {
      "type": "boolean",
      "value": false,
      "title": "Đối chiếu hồ sơ vận chuyển"
    },
    "corroboration_class_photo": {
      "type": "boolean",
      "value": false,
      "title": "Đối chiếu ảnh lớp"
    },
    "radio_static_matched": {
      "type": "boolean",
      "value": false,
      "title": "Tín hiệu radio đã đối chiếu"
    }
  },
  "templates": {
    "requirements": {
      "notice_lantern_unlock": {
        "logic": "AND",
        "check": [
          {
            "type": "set",
            "subtype": "router",
            "target": "router_well_echoes",
            "op": "==",
            "value": true,
            "property": "visited"
          }
        ]
      },
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
      "school_undecided": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "chưa quyết định"
          }
        ]
      },
      "school_memory": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "ký ức"
          }
        ]
      },
      "school_evidence": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "bằng chứng"
          }
        ]
      },
      "station_ready": {
        "logic": "AND",
        "check": [
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
          },
          {
            "type": "state",
            "property": "evidence_evacuation_film",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
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
            "type": "state",
            "property": "evidence_evacuation_seal",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      },
      "tape_available": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tape"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "tape",
            "op": "<",
            "value": 1
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
          "level": "warning",
          "text": "Sương đang dày lên. Thời gian ở lại không còn nhiều."
        }
      ],
      "recover_hymn": [
        {
          "type": "set",
          "subtype": "state",
          "target": "hymn_partial",
          "value": false
        },
        {
          "type": "set",
          "subtype": "state",
          "target": "clue_hymn",
          "value": true
        }
      ],
      "open_archive": [
        {
          "type": "set",
          "subtype": "state",
          "target": "archive_partial",
          "value": false
        },
        {
          "type": "set",
          "subtype": "state",
          "target": "archive_open",
          "value": true
        }
      ],
      "verify_room7": [
        {
          "type": "set",
          "subtype": "state",
          "target": "room7_confirmed",
          "value": true
        }
      ],
      "open_room7_success": [
        {
          "type": "set",
          "subtype": "state",
          "target": "evidence_hidden_room",
          "value": true
        }
      ],
      "complete_tunnel_route": [
        {
          "type": "set",
          "subtype": "state",
          "target": "map_incomplete",
          "value": false
        },
        {
          "type": "set",
          "subtype": "state",
          "target": "clue_tunnel_partial",
          "value": false
        },
        {
          "type": "set",
          "subtype": "state",
          "target": "clue_tunnel",
          "value": true
        }
      ],
      "consume_action_ring_bell": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "bell_copper_wire",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "hymn_note",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "bell_clapper",
          "value": 1
        }
      ],
      "consume_action_decode_roster": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "class_register_copy",
          "value": 1
        }
      ],
      "consume_action_maze_path": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "guide_compass",
          "value": 1
        }
      ],
      "consume_action_find_hidden_box": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "well_badge",
          "value": 1
        }
      ],
      "consume_action_repair_mill": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "clockwork_spring",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "mill_gear_pin",
          "value": 1
        }
      ],
      "consume_action_open_archive": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "archive_key",
          "value": 1
        }
      ],
      "consume_action_restore_radio_components": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_crystal",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "insulated_wire",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "spare_fuse",
          "value": 1
        },
        {
          "type": "set",
          "subtype": "action",
          "target": "action_confront_voice",
          "property": "display",
          "value": "show"
        }
      ],
      "consume_action_overlay_map": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tracing_paper",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "inspection_loupe",
          "value": 1
        }
      ],
      "consume_action_unlock_room7": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "spare_room_key",
          "value": 1
        }
      ],
      "consume_action_force_room7": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "spare_room_key",
          "value": 1
        }
      ],
      "consume_action_open_room7_alternative": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_listen_mai_tape": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tape",
          "value": 1
        }
      ],
      "consume_action_follow_compass_uncertain": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "guide_compass",
          "value": 1
        }
      ],
      "consume_action_force_seal": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_repair_mill_partial": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "clockwork_spring",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "mill_gear_pin",
          "value": 1
        }
      ],
      "consume_action_force_mill_repair": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_stabilize_mill": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_bypass_archive_lock": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_reconstruct_archive_record": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tunnel_manifest",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "evacuation_film",
          "value": 1
        }
      ],
      "consume_action_open_archive_from_evidence": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tunnel_manifest",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "evacuation_film",
          "value": 1
        }
      ],
      "consume_action_compare_evacuation_film": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "evacuation_film",
          "value": 1
        }
      ],
      "consume_action_ring_bell_imperfect": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "bell_copper_wire",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "hymn_note",
          "value": 1
        },
        {
          "type": "item",
          "subtype": "usage",
          "target": "bell_clapper",
          "value": 1
        }
      ],
      "consume_action_correct_bell_signal": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "radio_toolkit",
          "value": 1
        }
      ],
      "consume_action_restore_hymn_note": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "guestbook",
          "value": 1
        }
      ],
      "consume_action_listen_static": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tape",
          "value": 1
        }
      ],
      "consume_action_reconstruct_manifest": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "evacuation_film",
          "value": 1
        }
      ],
      "consume_action_verify_evacuation_film": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tunnel_manifest",
          "value": 1
        }
      ],
      "consume_action_recover_hymn": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "guestbook",
          "value": 1
        }
      ],
      "consume_action_reconstruct_stakes_evidence": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "class_photo",
          "value": 1
        }
      ],
      "consume_action_verify_tunnel_clue": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tunnel_manifest",
          "value": 1
        }
      ],
      "consume_action_verify_ticket": [
        {
          "type": "item",
          "subtype": "usage",
          "target": "tunnel_manifest",
          "value": 1
        }
      ]
    },
    "automation": {}
  },
  "itemInfo": {
    "lantern": {
      "name": "Đèn bão",
      "category": "tool",
      "icon": "light",
      "desc": "Đèn bão cũ, kính ám khói và quai xách đã sờn. Ánh sáng của nó làm lộ những vệt dấu mờ trong sương mà mắt thường khó nhận ra.",
      "usage": {
        "current": 0,
        "max": 1
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
      "category": "document",
      "icon": "menu_book",
      "desc": "Cuốn sổ khách đã ngả vàng, nhiều trang nhòe nước. Ở trang cuối, một cái tên được viết bằng mực còn mới bất thường.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Đọc rõ"
          ],
          [
            50,
            "Khó đọc"
          ],
          [
            100,
            "Không đọc được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "tape": {
      "name": "Cuộn băng",
      "category": "media",
      "icon": "audio_file",
      "desc": "Cuộn băng được bọc trong giấy dầu, nhãn ghi ngày đêm mất điện. Khi phát lại, giữa tiếng rè có một tín hiệu ngắn lặp lại.",
      "usage": {
        "current": 0,
        "max": 1,
        "autoInc": false,
        "status": [
          [
            0,
            "Âm thanh rõ"
          ],
          [
            33,
            "Nhiễu nhẹ"
          ],
          [
            67,
            "Nhiễu nặng"
          ],
          [
            100,
            "Mất tín hiệu"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "red_umbrella": {
      "name": "Ô đỏ",
      "category": "evidence",
      "icon": "rainy",
      "desc": "Chiếc ô đỏ bạc màu, một nan bị cong và cán có vết khắc nhỏ. Mai từng nhắc đến nó, nhưng dấu khắc dường như không phải tên chủ sở hữu.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Dấu khắc rõ"
          ],
          [
            50,
            "Khó nhận dạng"
          ],
          [
            100,
            "Mất dấu khắc"
          ]
        ]
      },
      "effect": {
        "use": [
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          }
        ]
      }
    },
    "bell_clapper": {
      "name": "Quả lắc chuông",
      "category": "mechanism",
      "icon": "notifications",
      "desc": "Quả lắc bằng kim loại nặng, bề mặt có vết va đập và một đầu còn dấu tháo khỏi trục. Nó cần được lắp lại tại cơ cấu chuông ở tháp nhà nguyện; kiểm tra vật phẩm không tự làm chuông rung.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Chưa lắp"
          ],
          [
            33,
            "Hư hại nhẹ"
          ],
          [
            67,
            "Hư hại nặng"
          ],
          [
            100,
            "Bị hỏng"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "class_photo": {
      "name": "Ảnh lớp",
      "category": "evidence",
      "icon": "photo",
      "desc": "Ảnh lớp cũ bị xé ở giữa. Những người còn lại đứng sát nhau, nhưng khoảng trống và mép giấy cho thấy một người đã bị loại khỏi ảnh.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Ảnh rõ nét"
          ],
          [
            33,
            "Rách nhẹ"
          ],
          [
            67,
            "Khó đối chiếu"
          ],
          [
            100,
            "Không phục dựng được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "archive_key": {
      "name": "Chìa khóa kho hồ sơ",
      "category": "key",
      "icon": "key",
      "desc": "Chìa khóa sắt có răng khóa không đều, dính bụi bê tông và một vệt dầu cũ. Nó thuộc tủ hồ sơ tại khu kho; cần tương tác với tủ ở đúng địa điểm để mở, không phải cửa phòng thông thường.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Răng khóa tốt"
          ],
          [
            33,
            "Mòn nhẹ"
          ],
          [
            67,
            "Khó xoay"
          ],
          [
            100,
            "Khóa bị hỏng"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "map_fragment": {
      "name": "Mảnh bản đồ",
      "category": "document",
      "icon": "map",
      "desc": "Mảnh bản đồ vẽ bằng tay, góc giấy bị cháy và một tuyến đường được đánh dấu bằng mực xanh. Một ký hiệu ở phía Bắc vẫn chưa được giải thích.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Nét vẽ rõ"
          ],
          [
            33,
            "Mực nhạt"
          ],
          [
            67,
            "Khó đối chiếu"
          ],
          [
            100,
            "Không đọc được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "radio_toolkit": {
      "name": "Bộ dụng cụ sửa radio",
      "category": "tool",
      "icon": "build",
      "desc": "Bộ tua vít cách điện, kìm nhỏ và đầu dò mạch trong hộp vải ở lớp học. Dùng mở thiết bị, kiểm tra tiếp điểm và tháo linh kiện an toàn; phối hợp trong Action sửa chữa phù hợp.",
      "usage": {
        "current": 0,
        "max": 5,
        "autoInc": false,
        "status": [
          [
            0,
            "Đầy đủ"
          ],
          [
            20,
            "Hao mòn nhẹ"
          ],
          [
            40,
            "Xuống cấp"
          ],
          [
            60,
            "Khó sử dụng"
          ],
          [
            80,
            "Hư hỏng nặng"
          ],
          [
            100,
            "Không sử dụng được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "insulated_wire": {
      "name": "Dây điện cách nhiệt",
      "category": "material",
      "icon": "cable",
      "desc": "Cuộn dây còn lớp cách điện, tìm thấy trong hầm rượu; có thể thay dây đứt hoặc nối tạm tiếp điểm, phối hợp cùng cầu chì và bộ dụng cụ tại Action sửa mạch.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Cách điện tốt"
          ],
          [
            50,
            "Sắp hở dây"
          ],
          [
            100,
            "Hở điện"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "spare_fuse": {
      "name": "Cầu chì dự phòng",
      "category": "material",
      "icon": "electrical_services",
      "desc": "Cầu chì sứ còn nguyên trong hộp linh kiện cũ ở hầm rượu, dùng thay cầu chì cháy khi lắp vào thiết bị bằng Action phối hợp vật liệu.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Còn tốt"
          ],
          [
            50,
            "Chịu tải yếu"
          ],
          [
            100,
            "Bị hỏng"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "clockwork_spring": {
      "name": "Lò xo cơ khí",
      "category": "material",
      "icon": "settings",
      "desc": "Lò xo thép còn đàn hồi lấy từ hộp bảo trì cối xay, có thể thay bộ phận hồi lực bị mất; dùng cùng chốt truyền động và bộ dụng cụ để sửa cơ cấu cối xay.",
      "usage": {
        "current": 0,
        "max": 4,
        "autoInc": false,
        "status": [
          [
            0,
            "Đàn hồi tốt"
          ],
          [
            25,
            "Lực hồi ổn"
          ],
          [
            50,
            "Lực hồi yếu"
          ],
          [
            75,
            "Rất yếu"
          ],
          [
            100,
            "Mất đàn hồi"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "tracing_paper": {
      "name": "Giấy can",
      "category": "material",
      "icon": "description",
      "desc": "Giấy can mỏng trong ngăn bàn giáo viên, dùng chép chồng ký hiệu để đối chiếu bản đồ và hướng cơ cấu.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Giấy sạch"
          ],
          [
            33,
            "Chồng nét"
          ],
          [
            67,
            "Khó đối chiếu"
          ],
          [
            100,
            "Không đối chiếu được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "inspection_loupe": {
      "name": "Kính kiểm tra",
      "category": "tool",
      "icon": "search",
      "desc": "Kính phóng đại nhỏ trong hộp dụng cụ giáo viên, dùng phát hiện nét khắc, dấu sửa và chi tiết nhỏ trên vật chứng.",
      "usage": {
        "current": 0,
        "max": 4,
        "autoInc": false,
        "status": [
          [
            0,
            "Quan sát rõ"
          ],
          [
            25,
            "Bám bụi"
          ],
          [
            50,
            "Phóng đại yếu"
          ],
          [
            75,
            "Khó quan sát"
          ],
          [
            100,
            "Không sử dụng được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "radio_crystal": {
      "name": "Cuộn tinh thể thu sóng",
      "category": "mechanism",
      "icon": "radio",
      "desc": "Cuộn tinh thể nhỏ nằm trong vỏ kim loại nứt. Các chân tiếp xúc bị xỉn màu, nhưng cấu trúc bên trong có thể lưu lại một tần số phát thanh. Cần xử lý tại hộp loa phát thanh bằng Action sửa radio; kiểm tra trong Inventory chỉ xem linh kiện, không tự khôi phục tín hiệu.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Thu sóng tốt"
          ],
          [
            33,
            "Tín hiệu yếu"
          ],
          [
            67,
            "Thu sóng kém"
          ],
          [
            100,
            "Mất tín hiệu"
          ]
        ]
      },
      "effect": {
        "use": [],
        "equip": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1,
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "set",
                  "subtype": "action",
                  "target": "action_confront_voice",
                  "property": "display",
                  "op": "==",
                  "value": "show"
                }
              ]
            }
          }
        ]
      }
    },
    "well_badge": {
      "name": "Phù hiệu đội sơ tán",
      "category": "evidence",
      "icon": "badge",
      "desc": "Phù hiệu kim loại phủ cặn nước, khắc biểu tượng đội sơ tán. Mặt sau có dấu đóng mờ, cùng kiểu với ký hiệu trên một vật được niêm kín. Phù hiệu này có thể liên quan đến chuyến bàn giao mười hai người, nhưng bản lưu chuyến xe chỉ ghi mười một.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Dấu rõ nét"
          ],
          [
            50,
            "Khó xác thực"
          ],
          [
            100,
            "Không xác thực được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "spare_room_key": {
      "name": "Chìa khóa phòng thứ bảy",
      "category": "key",
      "icon": "key",
      "desc": "Chìa khóa đồng mang số bảy, răng khóa còn mới hơn phần thân đã xỉn màu. Số phòng này không xuất hiện trong sơ đồ nhà trọ; dùng tại cánh cửa ẩn ở nhà trọ, tương tác đúng địa điểm để mở.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Răng khóa tốt"
          ],
          [
            33,
            "Mòn nhẹ"
          ],
          [
            67,
            "Khó xoay"
          ],
          [
            100,
            "Không mở được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "evacuation_film": {
      "name": "Cuộn phim sơ tán",
      "category": "media",
      "icon": "movie",
      "desc": "Cuộn phim nhỏ được bọc kín để tránh ẩm. Trên hộp có ghi ngày sơ tán; một vài khung hình có thể cho thấy những người mà hồ sơ làng phủ nhận.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Khung hình rõ"
          ],
          [
            33,
            "Trầy nhẹ"
          ],
          [
            67,
            "Khó phục dựng"
          ],
          [
            100,
            "Không phục dựng được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "hymn_note": {
      "name": "Trang ghi chú trong thánh ca",
      "category": "document",
      "icon": "description",
      "desc": "Trang giấy gấp giấu trong gáy thánh ca. Những dòng ghi chú nói về tín hiệu chuông, thứ tự ba hồi và lý do không được có hồi thứ tư; phần cuối bị mực thấm làm nhòe.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Ghi chú rõ"
          ],
          [
            33,
            "Mực nhòe"
          ],
          [
            67,
            "Khó giải mã"
          ],
          [
            100,
            "Không giải mã được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "bell_copper_wire": {
      "name": "Dây đồng chuông",
      "category": "mechanism",
      "icon": "cable",
      "desc": "Đoạn dây đồng bị xoắn và có một đầu tuột khỏi mối nối. Vết xước cho thấy nó từng nằm trong cơ cấu truyền lực của tháp chuông; cần nối tại cơ cấu chuông ở tháp, kiểm tra vật phẩm không tự sửa cơ cấu.",
      "usage": {
        "current": 0,
        "max": 4,
        "autoInc": false,
        "status": [
          [
            0,
            "Nối chắc"
          ],
          [
            25,
            "Tiếp xúc yếu"
          ],
          [
            50,
            "Tiếp xúc kém"
          ],
          [
            75,
            "Chập chờn"
          ],
          [
            100,
            "Đứt mối nối"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "class_register_copy": {
      "name": "Bản sao sổ điểm danh",
      "category": "document",
      "icon": "menu_book",
      "desc": "Bản sao sổ điểm danh với mép giấy bị xé và vài dòng bị bôi đen. Số sĩ số ở đầu trang vẫn còn đọc được, dù danh sách tên đã bị sửa.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Dữ liệu rõ"
          ],
          [
            33,
            "Dòng bị nhòe"
          ],
          [
            67,
            "Dữ liệu mờ"
          ],
          [
            100,
            "Không xác minh được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "guide_compass": {
      "name": "La bàn người dẫn đường",
      "category": "tool",
      "icon": "explore",
      "desc": "La bàn cũ có mặt kính nứt nhẹ. Mặt sau khắc một tuyến đường bằng các ô và dấu mốc, khác với những lối mòn đang thay đổi trong rừng; dùng để giải mê cung tại khu rừng, không tự mở đường toàn cục.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Chỉ hướng chuẩn"
          ],
          [
            33,
            "Sai lệch nhẹ"
          ],
          [
            67,
            "Khó định hướng"
          ],
          [
            100,
            "Mất phương hướng"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "evacuation_seal": {
      "name": "Con dấu đội sơ tán",
      "category": "evidence",
      "icon": "approval",
      "desc": "Con dấu gỗ đã mòn ở tay cầm, mặt dấu còn biểu tượng đội sơ tán. Một lớp đất khô bám trong các rãnh cho thấy nó từng bị chôn giấu.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Dấu rõ nét"
          ],
          [
            50,
            "Dấu mờ"
          ],
          [
            100,
            "Mất dấu"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "mill_gear_pin": {
      "name": "Chốt truyền động",
      "category": "mechanism",
      "icon": "settings",
      "desc": "Chốt kim loại ngắn, cong nhẹ ở một đầu và phủ dầu khô. Kích thước khớp với một vị trí trống trong bộ truyền động cối xay; cần lắp tại cơ cấu cối xay ở đúng địa điểm, kiểm tra vật phẩm không tự sửa máy.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Chốt nguyên"
          ],
          [
            50,
            "Cong lệch"
          ],
          [
            100,
            "Mất cố định"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "tunnel_manifest": {
      "name": "Danh sách vận chuyển",
      "category": "document",
      "icon": "description",
      "desc": "Danh sách vận chuyển được cuộn trong ống chống ẩm. Nhiều tên được chia theo lượt, kèm dấu thời gian và ký hiệu tuyến đường.",
      "usage": {
        "current": 0,
        "max": 3,
        "autoInc": false,
        "status": [
          [
            0,
            "Danh sách rõ"
          ],
          [
            33,
            "Nhòe một phần"
          ],
          [
            67,
            "Dữ liệu mờ"
          ],
          [
            100,
            "Không đối chiếu được"
          ]
        ]
      },
      "effect": {
        "use": []
      }
    },
    "unpunched_ticket": {
      "name": "Vé tàu chưa xé",
      "category": "evidence",
      "icon": "confirmation_number",
      "desc": "Vé tàu cũ còn nguyên phần kiểm soát, chưa bị xé. Giờ khởi hành 03:17 được in rõ, trong khi tên ga đến đã phai.",
      "usage": {
        "current": 0,
        "max": 2,
        "autoInc": false,
        "status": [
          [
            0,
            "Vé nguyên vẹn"
          ],
          [
            50,
            "Khó xác minh"
          ],
          [
            100,
            "Không xác minh được"
          ]
        ]
      },
      "effect": {
        "use": []
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
    "scene_village": {
      "meta": {
        "title": "Ngôi làng",
        "desc": "Cả ngôi làng chìm trong một màn đêm đặc quánh. Những mái nhà đen sì chỉ còn là đường viền sau lớp sương thấp; vài ô cửa sổ le lói ánh đèn vàng nhưng không có bóng người phía sau. Gió luồn qua những con ngõ hẹp, kéo theo tiếng cửa gỗ va đập và tiếng loa phát thanh rè rè từ quảng trường. Không một con chó sủa, không một côn trùng kêu. Cảm giác như cả làng đang nín thở, chờ bạn bước vào một nơi mà mọi lối đi đều dẫn về một ký ức chưa chịu yên nghỉ."
      },
      "set": {
        "activeRouterId": "router_village_night"
      },
      "routers": {
        "router_village_night": {
          "meta": {
            "sceneID": "scene_village",
            "subTitleStatus": "Đêm tối",
            "desc": "Ngôi làng chìm trong đêm. Sương thấp che khuất các khúc quanh và làm tầm nhìn chỉ còn vài bước. Loa phát thanh ở quảng trường phát những cái tên bằng giọng méo mó; các căn nhà im lìm, nhưng một vài ô cửa có dấu hiệu chuyển động trong bóng tối."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_village_square",
            "action_travel_inn",
            "action_travel_chapel",
            "action_travel_school",
            "action_travel_forest"
          ]
        }
      }
    },
    "scene_village_square": {
      "meta": {
        "title": "Quảng trường làng",
        "desc": "Không gian công cộng ở trung tâm làng; bảng thông báo và loa phát thanh là hai nguồn manh mối đầu tiên.",
        "parentScene": "scene_village"
      },
      "set": {
        "activeRouterId": "router_square_fogbound"
      },
      "routers": {
        "router_square_fogbound": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Mù sương",
            "desc": "Sương dày phủ quảng trường và làm mờ các dãy nhà quanh cổng làng. Loa phát thanh lặp lại tên những người mất tích. Bảng thông báo lưu danh sách dân làng, trong đó một cái tên bị cạo bỏ."
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
            "action_observe_mai",
            "action_listen_mai_tape",
            "action_decode_broadcast"
          ]
        },
        "router_square_broadcast_decoded": {
          "meta": {
            "sceneID": "scene_village_square",
            "subTitleStatus": "Phát thanh lặp",
            "desc": "Hộp loa chứa cuộn dây đồng và sơ đồ tần số. Tiếng gọi tên không phải phát trực tiếp mà là bản ghi được phát lặp theo chu kỳ."
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
            "action_observe_mai",
            "action_listen_mai_tape",
            "action_restore_radio_signal"
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
            "subTitleStatus": "Tiếng gõ đều đặn",
            "desc": "Chiếc giếng đá phủ rêu phát ra tiếng gõ đều đặn. Trên thành giếng có bốn vạch khắc mới và một vết kim loại bị cào xước."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern"
          ]
        },
        "router_well_bottom_revealed": {
          "meta": {
            "sceneID": "scene_village_well",
            "subTitleStatus": "Phù hiệu sơ tán",
            "desc": "Một hốc nhỏ dưới mực nước cũ chứa phù hiệu kim loại của đội sơ tán. Ký hiệu trên phù hiệu trùng với dấu trên bản đồ làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_well",
            "action_use_lantern",
            "action_retrieve_well_badge"
          ]
        }
      }
    },
    "scene_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "desc": "Nhà trọ là nơi lưu giữ sổ khách và lời khai về những người chưa thể rời làng.",
        "parentScene": "scene_village"
      },
      "set": {
        "activeRouterId": "router_inn_unsettled"
      },
      "routers": {
        "router_inn_unsettled": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Tên đến trong tương lai",
            "desc": "Quầy lễ tân còn mùi trà nguội. Sổ khách ghi những người được cho là đã rời làng; trang cuối có tên An với ngày đến là ngày mai."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_talk_hanh",
            "action_open_guestbook",
            "action_unlock_cellar",
            "action_find_spare_key",
            "action_confirm_room7",
            "action_unlock_room7",
            "action_force_room7",
            "action_repair_room7_key",
            "action_open_room7_alternative",
            "action_inspect_damaged_lock",
            "action_dry_guestbook",
            "action_compare_guestbook_photo",
            "action_verify_guestbook",
            "action_rest_at_inn",
            "action_recover_with_mai"
          ]
        },
        "router_inn_hidden_room": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Phòng ẩn đã mở",
            "desc": "Sau quầy lễ tân có ổ khóa nối với hành lang. Phòng thứ bảy không có trong sơ đồ nhà trọ; bên trong còn một thẻ gửi đồ cũ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_talk_hanh",
            "action_open_guestbook",
            "action_unlock_cellar",
            "action_confirm_room7",
            "action_unlock_room7",
            "action_force_room7",
            "action_repair_room7_key",
            "action_open_room7_alternative",
            "action_inspect_damaged_lock",
            "action_dry_guestbook",
            "action_compare_guestbook_photo",
            "action_verify_guestbook",
            "action_rest_at_inn",
            "action_recover_with_mai",
            "action_listen_static"
          ]
        },
        "router_room7_forced": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Cửa bị phá",
            "desc": "Cửa phòng thứ bảy bị cưỡng chế mở. Khóa và khung cửa mang dấu hư hại; manh mối bên trong chưa đầy đủ, nhưng căn phòng vẫn có thể được tiếp tục điều tra."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_talk_hanh",
            "action_open_guestbook",
            "action_unlock_cellar",
            "action_confirm_room7",
            "action_unlock_room7",
            "action_force_room7",
            "action_repair_room7_key",
            "action_open_room7_alternative",
            "action_inspect_damaged_lock",
            "action_dry_guestbook",
            "action_compare_guestbook_photo",
            "action_verify_guestbook",
            "action_rest_at_inn",
            "action_recover_with_mai"
          ]
        },
        "router_room7_repaired": {
          "meta": {
            "sceneID": "scene_inn",
            "subTitleStatus": "Khóa đã phục hồi",
            "desc": "Chìa khóa và ổ khóa phòng thứ bảy đã được phục hồi. Cửa có thể mở bằng chìa khóa; các dấu vết còn lại trong phòng vẫn cần được đối chiếu."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_talk_hanh",
            "action_open_guestbook",
            "action_unlock_cellar",
            "action_confirm_room7",
            "action_unlock_room7",
            "action_force_room7",
            "action_repair_room7_key",
            "action_open_room7_alternative",
            "action_inspect_damaged_lock",
            "action_dry_guestbook",
            "action_compare_guestbook_photo",
            "action_verify_guestbook",
            "action_rest_at_inn",
            "action_recover_with_mai"
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
            "desc": "Ổ khóa hầm đã bật, để lộ cầu thang xuống căn hầm rượu tối và lạnh. Một cuộn băng ghi âm đêm mất điện nằm sau chiếc thùng rỗng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar",
            "action_find_evacuation_film",
            "action_find_cellar_components"
          ]
        },
        "router_cellar_recording_found": {
          "meta": {
            "sceneID": "scene_inn_cellar",
            "subTitleStatus": "Cuộn phim chưa tráng",
            "desc": "Phía sau kệ rượu có máy chiếu cũ và cuộn phim chưa tráng. Phim có dấu hiệu ghi lại cảnh người dân tập trung ở bờ đê trước thời điểm mất điện; nội dung chưa được xác minh đầy đủ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_search_cellar"
          ]
        }
      }
    },
    "scene_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "desc": "Gian cầu nguyện lưu bản thánh ca chứa mật từ và lời giải về hồi chuông cuối.",
        "parentScene": "scene_village"
      },
      "set": {
        "activeRouterId": "router_chapel_silent"
      },
      "routers": {
        "router_chapel_silent": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Im lặng",
            "desc": "Gian cầu nguyện yên tĩnh. Chuông đã ngừng ngân từ mười bảy năm trước; bản thánh ca còn lưu mật từ và chỉ dẫn về ba hồi chuông."
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
            "action_find_hymn_note",
            "action_restore_hymn_note"
          ]
        },
        "router_chapel_cryptic_note": {
          "meta": {
            "sceneID": "scene_chapel",
            "subTitleStatus": "Tín hiệu sơ tán",
            "desc": "Trang giấy khâu vào gáy sách xác nhận ba hồi chuông là tín hiệu kết thúc sơ tán, còn hồi thứ tư là lệnh ở lại."
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
            "action_restore_hymn_note"
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
            "desc": "Quả chuông treo trên tháp phía trên mặt đồng hồ. Quả lắc đã bị tháo rời; mã khắc dưới mặt đồng hồ liên quan đến thời điểm dân làng biến mất."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_recover_bell_wire",
            "action_ring_bell_imperfect",
            "action_correct_bell_signal"
          ]
        },
        "router_bell_mechanism_repaired": {
          "meta": {
            "sceneID": "scene_chapel_tower",
            "subTitleStatus": "Cơ cấu đã nối",
            "desc": "Dây đồng đã được nối vào trục bánh răng và cơ cấu truyền lực hoạt động. Chuông vẫn chưa thể rung cho đến khi tìm được quả lắc."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_solve_bell",
            "action_ring_bell",
            "action_ring_bell_imperfect",
            "action_correct_bell_signal"
          ]
        }
      }
    },
    "scene_abandoned_school": {
      "meta": {
        "title": "Tòa trường tiểu học bỏ hoang",
        "desc": "Tòa trường nằm bên con đường có những dấu chân nhỏ dẫn từ cổng vào lớp học số 3. Hành lang tối và im lìm; những dấu vết trong tòa nhà cho thấy một lớp học đã bị xóa khỏi hồ sơ sơ tán.",
        "parentScene": "scene_village"
      },
      "set": {
        "activeRouterId": "router_school_entry"
      },
      "routers": {
        "router_school_entry": {
          "meta": {
            "sceneID": "scene_abandoned_school",
            "subTitleStatus": "Hành lang phủ bụi",
            "desc": "Cửa trường mở hé. Bụi phủ nền hành lang, ngoại trừ một hàng dấu chân nhỏ hướng về lớp học số 3. Từ lớp học vọng ra tiếng lật giấy rất khẽ."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_enter_classroom_03"
          ]
        }
      }
    },
    "scene_school_classroom_03": {
      "meta": {
        "title": "Lớp học số 3",
        "desc": "Một lớp học tiểu học bỏ hoang vẫn còn nguyên những dãy bàn thấp, bục giảng, tủ đồ, cửa sổ và chiếc đồng hồ treo tường đã ngừng chạy. Bụi phủ kín mặt bàn; vài trang thông báo sơ tán còn ghim cạnh cửa. Căn phòng chưa tự tiết lộ điều gì — người chơi phải tự chọn nơi khám phá và lần theo các dấu vết.",
        "parentScene": "scene_abandoned_school"
      },
      "set": {
        "activeRouterId": "router_classroom_overview"
      },
      "routers": {
        "router_classroom_overview": {
          "meta": {
            "sceneID": "scene_school_classroom_03",
            "subTitleStatus": "Còn nguyên trạng",
            "desc": "Lớp học số 3 có ba dãy bàn ghế phủ bụi, bục giảng dưới bảng đen, đồng hồ chết máy gần cửa sổ và thông báo sơ tán đã ngả vàng trên bảng tin. Chưa có dấu hiệu đủ rõ để xác định sự việc đã xảy ra."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_examine_blackboard",
            "action_inspect_student_seat",
            "action_inspect_class_clock",
            "action_inspect_evacuation_notice",
            "action_check_desk",
            "action_talk_linh",
            "action_overlay_map",
            "action_retrace_map",
            "action_compare_evacuation_film",
            "action_rest_at_inn",
            "action_recover_with_linh",
            "action_reward_memory_roster",
            "action_find_inspection_loupe",
            "action_find_classroom_supplies"
          ]
        },
        "router_classroom_archive_open": {
          "meta": {
            "sceneID": "scene_school_classroom_03",
            "subTitleStatus": "Sĩ số 12 được xác nhận",
            "desc": "Ngăn bàn cuối lớp chứa bản sao sổ điểm danh. Dòng thứ mười hai bị bôi đen; số thứ tự và ngày nghỉ học trùng với hồ sơ sơ tán. Sĩ số mười hai người được xác nhận, nhưng danh tính một học sinh vẫn bị xóa khỏi các tài liệu khác."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_student_seat",
            "action_inspect_class_clock",
            "action_inspect_evacuation_notice",
            "action_check_desk",
            "action_talk_linh",
            "action_decode_roster",
            "action_overlay_map",
            "action_retrace_map",
            "action_compare_evacuation_film",
            "action_recover_with_linh",
            "action_reward_memory_roster",
            "action_find_inspection_loupe"
          ]
        }
      }
    },
    "scene_classroom_blackboard": {
      "meta": {
        "title": "Bảng đen lớp học số 3",
        "desc": "Khu vực bảng đen ở phía trước lớp học số 3. Những vệt phấn, dòng chữ bị cạo và phần danh sách còn sót lại tập trung quanh cùng một vị trí.",
        "parentScene": "scene_school_classroom_03"
      },
      "set": {
        "activeRouterId": "router_classroom_blackboard"
      },
      "routers": {
        "router_classroom_blackboard": {
          "meta": {
            "sceneID": "scene_classroom_blackboard",
            "subTitleStatus": "Chưa giải mã",
            "desc": "Mặt bảng phủ bụi phấn và các vệt lau chồng lên nhau. Một vài nét chữ còn sót lại nhưng chưa đủ để đọc; một vị trí bị cạo mạnh hơn những chỗ khác."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_read_blackboard",
            "action_repair_radio_toolkit"
          ]
        },
        "router_classroom_erased": {
          "meta": {
            "sceneID": "scene_classroom_blackboard",
            "subTitleStatus": "Xóa tên có chủ ý",
            "desc": "Một số tên học sinh bị xóa có chủ ý; một vị trí trên bảng bị cạo mạnh đến mức mặt bảng xước thành đường trắng. Dấu vết cần được đối chiếu với sơ đồ chỗ ngồi và hồ sơ lớp."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_recover_class_register"
          ]
        }
      }
    },
    "scene_north_forest": {
      "meta": {
        "title": "Lối rừng phía Bắc",
        "desc": "Con đường xuyên rừng biến đổi, nhưng các dấu sơn giúp lần tới khu đất nghi lễ.",
        "parentScene": "scene_village"
      },
      "set": {
        "activeRouterId": "router_forest_path_shifting"
      },
      "routers": {
        "router_forest_path_shifting": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Đường đi biến đổi",
            "desc": "Con đường mòn dưới tán thông không giữ nguyên hình dạng. Những vệt sơn trên thân cây là dấu hiệu hiếm hoi để xác định hướng tới khoảng đất trống."
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
            "action_enter_watermill",
            "action_collect_forest_compass",
            "action_follow_compass_uncertain",
            "action_verify_forest_route"
          ]
        },
        "router_forest_markers_aligned": {
          "meta": {
            "sceneID": "scene_north_forest",
            "subTitleStatus": "Tuyến đường được xác định",
            "desc": "Các dấu sơn đã được đối chiếu với hướng la bàn. Chúng xác định tuyến đường qua rừng và đồng thời đánh dấu lối vận chuyển người xuống bờ đê."
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
            "action_enter_watermill",
            "action_follow_compass_uncertain",
            "action_verify_forest_route"
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
            "desc": "Mười hai cọc gỗ tạo thành vòng cung giữa khoảng đất trống, nhưng chỉ có mười một chiếc bóng. Một hộp chôn gần vòng cọc chứa các mảnh ảnh gia đình."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_find_wooden_seal",
            "action_force_seal",
            "action_verify_seal"
          ]
        },
        "router_clearing_ritual_trace": {
          "meta": {
            "sceneID": "scene_forest_clearing",
            "subTitleStatus": "Con dấu sơ tán",
            "desc": "Con dấu gỗ nằm dưới phiến đá giữa vòng cọc. Đây không phải vật tế lễ mà là dấu xác nhận của đội sơ tán, dùng để niêm phong danh sách người đã rời làng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_stakes",
            "action_find_hidden_box",
            "action_force_seal",
            "action_verify_seal"
          ]
        }
      }
    },
    "scene_watermill": {
      "meta": {
        "title": "Cối xay nước",
        "desc": "Cối xay cũ là nút cơ giới dẫn xuống đường hầm dưới chân đê.",
        "parentScene": "scene_north_forest"
      },
      "set": {
        "activeRouterId": "router_watermill_stalled"
      },
      "routers": {
        "router_watermill_stalled": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Ngừng hoạt động",
            "desc": "Dòng suối đã cạn và bánh xe mục kẹt cứng trên trục. Bảng điều khiển còn nguyên; cần sơ đồ từ trường học để xác định cách lắp cơ cấu truyền động."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_repair_mill_partial",
            "action_force_mill_repair",
            "action_stabilize_mill",
            "action_bypass_mill",
            "action_find_mill_components"
          ]
        },
        "router_watermill_running": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Đang vận hành",
            "desc": "Bánh xe đã ăn khớp với trục truyền động. Cửa sập dưới sàn rung theo nhịp máy và để lộ lối xuống đường hầm dưới chân đê."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_descend_tunnel"
          ]
        },
        "router_watermill_gear_inspected": {
          "meta": {
            "sceneID": "scene_watermill",
            "subTitleStatus": "Chốt bị cong",
            "desc": "Chốt truyền động trong cụm bánh răng bị cong, giải thích nguyên nhân cối xay dừng lại. Chốt chưa được thay thế hoặc lắp lại đúng vị trí."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_repair_mill",
            "action_repair_mill_partial",
            "action_force_mill_repair",
            "action_stabilize_mill",
            "action_bypass_mill",
            "action_find_mill_components",
            "action_restore_radio_signal_partial"
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
            "subTitleStatus": "Danh sách bị sửa",
            "desc": "Tường đường hầm ghi tên dân làng theo thứ tự ngày họ biến mất. Danh sách có dấu hiệu bị sửa; số tên thực tế nhiều hơn hồ sơ chính thức."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_tunnel_names",
            "action_open_archive",
            "action_reach_station",
            "action_reach_station_memory",
            "action_recover_tunnel_manifest",
            "action_bypass_archive_lock",
            "action_reconstruct_archive_record",
            "action_open_archive_from_evidence",
            "action_reconstruct_manifest",
            "action_verify_evacuation_film",
            "action_recover_hymn",
            "action_reconstruct_stakes_evidence",
            "action_verify_tunnel_clue",
            "action_reach_station_memory_evidence",
            "action_reward_memory_tunnel"
          ]
        },
        "router_tunnel_manifest_found": {
          "meta": {
            "sceneID": "scene_levee_tunnel",
            "subTitleStatus": "Ga tập kết được xác nhận",
            "desc": "Ống tài liệu chống ẩm sau lớp gạch rỗng chứa danh sách những người được đưa qua đường hầm. Hồ sơ xác nhận ga tàu là điểm tập kết cuối cùng."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_inspect_tunnel_names",
            "action_open_archive",
            "action_reach_station",
            "action_reach_station_memory",
            "action_bypass_archive_lock",
            "action_reconstruct_archive_record",
            "action_open_archive_from_evidence",
            "action_reconstruct_manifest",
            "action_verify_evacuation_film",
            "action_recover_hymn",
            "action_reconstruct_stakes_evidence",
            "action_verify_tunnel_clue",
            "action_reach_station_memory_evidence",
            "action_reward_memory_tunnel",
            "action_verify_route_from_radio"
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
            "subTitleStatus": "Chuyến 03:17 chưa xác minh",
            "desc": "Sân ga không có trên bản đồ hiện hành. Một chuyến tàu được ghi nhận lúc 03:17; giọng nói từ đường ray đặt ra lựa chọn về điều gì sẽ được giữ lại và điều gì phải chấm dứt, nhưng sự kiện vẫn chưa được xác minh độc lập."
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
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_find_station_ticket",
            "action_ending_release_partial",
            "action_ending_release_reconstructed",
            "action_verify_ticket",
            "action_confront_voice",
            "action_ground_with_radio"
          ]
        },
        "router_station_departure_records": {
          "meta": {
            "sceneID": "scene_ghost_station",
            "subTitleStatus": "Hồ sơ chuyến 03:17",
            "desc": "Dưới ghế chờ có vé tàu chưa xé và bản kê hành khách. Vé xác nhận chuyến 03:17 từng tồn tại, nhưng chưa chứng minh tất cả người trong danh sách đã lên tàu."
          },
          "set": {
            "blocked": false,
            "visited": false,
            "countVisited": 0
          },
          "actions": [
            "action_choose_fate",
            "action_ending_bury",
            "action_ending_echo",
            "action_ending_depart",
            "action_ending_release_partial",
            "action_ending_release_reconstructed",
            "action_verify_ticket"
          ]
        }
      }
    }
  },
  "actions": {
    "action_read_notice": {
      "meta": {
        "title": "Bảng thông báo",
        "buttonLabel": "Đọc các dòng còn lại",
        "desc": "Bảng thông báo dựng cạnh lối vào quảng trường, nơi dân làng từng xem tin và lịch sơ tán. Danh sách vẫn còn nguyên các dòng chữ, chỉ riêng một cái tên bị cạo sâu đến rách mặt giấy. Chiếc đèn bão phủ bụi được treo trên bảng, như thể người cuối cùng đọc thông báo đã vội bỏ nó lại giữa chừng."
      },
      "set": {
        "display": "show",
        "requirement": false,
        "readDesc": true
      },
      "effect": {
        "normal": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_village_notice",
            "value": true
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "lantern",
            "req": {
              "ref": "notice_lantern_unlock"
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cũng may có chiếc đèn bão treo trên bảng, nếu không mình chẳng đọc được gì... Nhưng có lẽ sau này mình sẽ cần dùng tới...",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "set",
                  "subtype": "router",
                  "target": "router_well_echoes",
                  "property": "visited",
                  "op": "==",
                  "value": false
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_notice_history",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "!has",
                  "value": "well_badge"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_notice_memory",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "has",
                  "value": "well_badge"
                },
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "!has",
                  "value": "lantern"
                }
              ]
            }
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_read_notice",
            "property": "display",
            "value": "hide",
            "req": {
              "ref": "notice_lantern_unlock"
            }
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_use_lantern",
            "property": "display",
            "value": "show",
            "req": {
              "ref": "notice_lantern_unlock"
            }
          }
        ],
        "pass": [],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Những dòng chữ vẫn rời rạc, chưa đủ để gợi lại điều bạn đã quên. Có lẽ một dấu vết khác sẽ giúp chúng nối liền."
          }
        ]
      }
    },
    "action_talk_mai": {
      "meta": {
        "title": "Mai",
        "buttonLabel": "Trò chuyện",
        "desc": "Mai đứng gần quảng trường nhưng luôn giữ khoảng cách với giếng đá. Cô dường như biết nhiều hơn những gì mình nói, và ánh mắt thường dừng lại ở những dấu vết bạn mang theo. Có lẽ cô chỉ sẵn lòng kể khi bạn tìm được điều gì đó khiến cô không thể tiếp tục im lặng."
      },
      "set": {
        "display": "show",
        "requirement": false,
        "readDesc": true
      },
      "effect": {
        "normal": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai_memory",
            "req": {
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
                  "property": "school_choice",
                  "op": "==",
                  "value": "ký ức"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai_evidence",
            "req": {
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
                  "property": "school_choice",
                  "op": "==",
                  "value": "bằng chứng"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "knows_twelve",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "!=",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "knows_twelve",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_lantern",
                  "op": "!=",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai_well",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "knows_twelve",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_lantern",
                  "op": "==",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_mai_umbrella",
            "req": {
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
                  "property": "school_choice",
                  "op": "==",
                  "value": "chưa quyết định"
                }
              ]
            }
          }
        ],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "mai",
            "property": "trust",
            "field": "current",
            "mode": "add",
            "value": 1,
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "action_count",
                  "target": "action_talk_mai",
                  "phase": "pass",
                  "op": "==",
                  "value": 1
                }
              ]
            }
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "mai_approach",
            "value": "trò chuyện"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_observe_mai",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_inspect_well": {
      "meta": {
        "title": "Giếng đá",
        "buttonLabel": "Quan sát dấu khắc",
        "desc": "Giếng đá nằm ở rìa quảng trường, phủ rêu nhưng phần thành phía đông có dấu mới bị cạo sạch. Bốn vạch khắc thẳng hàng giống ký hiệu đo đạc hơn là vết xước ngẫu nhiên; bên cạnh là một rãnh kim loại mảnh, như thể có vật gì từng được móc khỏi hốc đá."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_well",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_well",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Tối quá mình chỉ thấy lờ mờ những vạch khắc không rõ nét. Chắc phải kiếm thứ gì đó để chiếu sáng để nhìn rõ hơn.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "item",
                  "subtype": "inventory",
                  "op": "!has",
                  "value": "lantern"
                }
              ]
            }
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_use_lantern",
            "property": "display",
            "value": "show"
          }
        ]
      }
    },
    "action_use_lantern": {
      "meta": {
        "title": "Ký hiệu dưới đáy giếng",
        "buttonLabel": "Chiếu đèn vào hốc",
        "desc": "Đáy giếng chìm trong lớp nước cũ và bóng tối, nơi mắt thường không thể phân biệt ký hiệu trên thành đá. Những dấu khắc chỉ hiện rõ khi ánh sáng được chiếu đúng góc; chiếc đèn bão nhặt ở quảng trường có thể giúp soi ra phần chữ bị che khuất."
      },
      "set": {
        "display": "hide",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "info",
            "text": "Khoảng cách xa thế này đèn không soi tới được. Có lẽ phải tiến lại gần để quan sát giếng trước.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": false
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Nếu mình mãi chỉ cầm đèn như này không lẽ chờ ma quỷ nào đó thắp sáng cho mình. Chi bằng mình tự tay sử dụng còn hơn là cứ xách đèn như thế này.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "clue_lantern",
                  "op": "==",
                  "value": false
                },
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "==",
                  "value": [
                    "lantern"
                  ]
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mình cần một thứ gì đó sáng để nhìn rõ hơn.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "clue_lantern",
                  "op": "==",
                  "value": false
                },
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "!has",
                  "value": "lantern"
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Nhoài mình vào giếng rất mệt, ngoài đèn ra thì có lẽ mình không thể cầm thêm thứ khác trên tay nữa!",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "clue_lantern",
                  "op": "==",
                  "value": false
                },
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "has",
                  "value": "lantern"
                },
                {
                  "type": "item",
                  "subtype": "hand",
                  "op": "!=",
                  "value": [
                    "lantern"
                  ]
                },
                {
                  "type": "state",
                  "property": "clue_well",
                  "op": "==",
                  "value": true
                }
              ]
            }
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_well",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "lantern"
            ]
          },
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_talk_hanh": {
      "meta": {
        "title": "Bà Hạnh",
        "buttonLabel": "Trò chuyện",
        "desc": "Bà Hạnh quản lý nhà trọ và nắm giữ cuốn sổ ghi khách đến, khách đi. Bà khẳng định nơi này chỉ có sáu phòng, nhưng hành lang phía sau quầy lại có bảy cánh cửa. Sự chênh lệch ấy không giống một nhầm lẫn trong cách đếm; nó giống một căn phòng đã bị cố tình xóa khỏi lời kể."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh_memory",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "==",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "ký ức"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh_evidence",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "==",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "bằng chứng"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh_room",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "==",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "chưa quyết định"
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh_guestbook",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "found_guestbook",
                  "op": "==",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh_notice",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "found_guestbook",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_village_notice",
                  "op": "==",
                  "value": true
                }
              ]
            }
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_hanh",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "evidence_hidden_room",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "found_guestbook",
                  "op": "!=",
                  "value": true
                },
                {
                  "type": "state",
                  "property": "clue_village_notice",
                  "op": "!=",
                  "value": true
                }
              ]
            }
          }
        ],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_talk_hanh",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "hanh",
            "property": "trust",
            "field": "current",
            "mode": "add",
            "value": 1
          }
        ]
      }
    },
    "action_open_guestbook": {
      "meta": {
        "title": "Sổ khách",
        "buttonLabel": "Lật đến trang cuối",
        "desc": "Cuốn sổ khách nằm sau quầy lễ tân, giấy đã ngả vàng và nhiều trang bị nhòe bởi hơi ẩm. Những dòng ghi chép cũ cho thấy khách thường rời đi ngay sau đêm mất điện. Ở trang cuối, tên bạn xuất hiện cạnh ngày đến là ngày mai, nét mực vẫn còn mới dù cuốn sổ đã bị bỏ quên. Nếu sổ bị ẩm, độ đọc được giảm và có thể phục hồi hoặc đối chiếu với ảnh."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "type": "set",
            "subtype": "action",
            "target": "action_open_guestbook",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuốn sổ khách hé lộ một cái tên và ngày đến—hai chi tiết không thể bỏ qua."
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "guestbook",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "guestbook_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_dry_guestbook",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_compare_guestbook_photo",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_confirmed",
            "value": false
          }
        ]
      }
    },
    "action_unlock_cellar": {
      "meta": {
        "title": "Cửa hầm rượu",
        "buttonLabel": "Nhập mật mã",
        "buttonIcon": "lock_open",
        "desc": "Ổ khóa phụ dưới quầy không dẫn ra cửa chính mà mở lối xuống hầm rượu, nơi nhà trọ cất những thứ không muốn khách nhìn thấy. Trên thân khóa có vết khắc của căn phòng thứ bảy; cơ cấu chỉ nhận đúng mật từ trong thánh ca và cần đối chiếu với sổ khách cùng chìa khóa dự phòng. Chìa khóa phòng thứ bảy không liên quan đến cửa hầm; cửa hầm dùng mã riêng."
      },
      "set": {
        "display": "show",
        "password": "string:pw_guest",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "warning",
            "text": "Chìa khóa phòng thứ bảy không vừa ổ khóa này. Cửa hầm dường như chờ một mật mã khác."
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
          }
        ]
      }
    },
    "action_search_cellar": {
      "meta": {
        "title": "Hầm rượu",
        "buttonLabel": "Tìm dấu vết",
        "desc": "Hầm rượu lạnh và gần như trống rỗng, ngoại trừ những thùng gỗ xếp sát tường. Một thùng rỗng có vết kéo lê mới trên nền bụi, phía sau nó là cuộn băng được bọc trong giấy dầu. Ngày ghi trên nhãn trùng với đêm mất điện mà các nhân chứng đều né tránh nhắc đến."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "text": "Cuộn băng lưu lại âm thanh trong đêm mất điện; bản ghi có thể hé lộ điều đã xảy ra trước khi làng chìm vào im lặng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_search_cellar",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_read_hymn": {
      "meta": {
        "title": "Bản thánh ca",
        "buttonLabel": "Giải mã chữ đầu dòng",
        "desc": "Bản thánh ca nằm trên giá gỗ trong gian cầu nguyện. Mực ở vài dòng đã nhạt, nhưng chữ cái đầu mỗi dòng vẫn được viết đậm bất thường; ghép chúng lại thành cụm “IM LANG”. Một dòng khác bị gạch dưới nhiều lần, nhắc đến ba hồi chuông và sự im lặng sau đó."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "text": "Bạn nhớ được mật từ “IM LANG” và quy tắc ba hồi chuông."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_read_hymn",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Linh giữ lại ký ức riêng. Bạn chỉ đọc thánh ca như một dấu hiệu, không ép em kể thêm.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "ký ức"
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Mật từ trong thánh ca khớp với hồ sơ. Những dòng chữ hé lộ một nghi thức bị che giấu.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "bằng chứng"
                }
              ]
            }
          }
        ]
      }
    },
    "action_talk_keeper": {
      "meta": {
        "title": "Người giữ nhà nguyện",
        "buttonLabel": "Trò chuyện",
        "desc": "Người giữ nhà nguyện đã ở đây từ trước khi chuông ngừng ngân. Ông không phủ nhận việc cơ cấu chuông bị tháo rời, nhưng luôn nói rằng tiếng chuông không chỉ để báo giờ. Theo ông, người giữ chuông phải chấp nhận điều đã xảy ra trước khi có thể đánh thức những ký ức bị chôn vùi."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_talk_keeper",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_keeper"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "keeper",
            "property": "remorse",
            "field": "current",
            "mode": "add",
            "value": 1
          }
        ]
      }
    },
    "action_solve_bell": {
      "meta": {
        "title": "Mã trên mặt đồng hồ",
        "buttonLabel": "Giải mã",
        "desc": "Mặt đồng hồ trên tháp đã dừng ở một thời điểm không khớp với bất kỳ chiếc đồng hồ nào trong làng. Dưới lớp bụi có mã bốn chữ số được khắc sâu, ngay cạnh dấu vít cho thấy quả lắc từng bị tháo khỏi cơ cấu. Con số này liên hệ trực tiếp đến thời khắc dân làng biến mất."
      },
      "set": {
        "display": "show",
        "password": "number:pw_bell",
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "type": "set",
            "subtype": "action",
            "target": "action_solve_bell",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mã trên đồng hồ đã được giải. Tiếng chuông trở lại trong ký ức, và quả lắc nằm trong tay bạn."
          }
        ]
      }
    },
    "action_ring_bell": {
      "meta": {
        "title": "Chuông nhà nguyện",
        "buttonLabel": "Rung chuông ba hồi",
        "desc": "Quả chuông lớn vẫn treo trên tháp, nhưng cơ cấu truyền lực đã bị tháo rời và để lại những đầu dây đồng trơ ra. Quả lắc được cất riêng, còn trang ghi chú trong thánh ca mô tả thứ tự tín hiệu: ba hồi để báo kết thúc sơ tán, tuyệt đối không có hồi thứ tư. Chỉ khi các bộ phận được lắp đúng, chuông mới có thể vang trở lại."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_ring_bell"
          },
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
            "type": "effect",
            "ref": "consume_action_ring_bell"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Cơ cấu chuông chưa hoàn chỉnh. Quả lắc, dây đồng và ghi chú vẫn còn thiếu; cả thời điểm rung chuông cũng phải chính xác."
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
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "bell_copper_wire",
            "op": "<",
            "value": 2
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "hymn_note",
            "op": "<",
            "value": 1
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "bell_clapper",
            "op": "<",
            "value": 2
          }
        ]
      }
    },
    "action_check_desk": {
      "meta": {
        "title": "Ngăn bàn giáo viên",
        "buttonLabel": "Tìm hồ sơ bị sửa",
        "desc": "Ngăn bàn giáo viên chứa một danh sách lớp đã bị sửa bằng mực đen. Bên cạnh là bức ảnh tập thể bị xé khỏi phần giữa. Danh sách và ảnh mâu thuẫn: một thứ có thể chứng minh sĩ số, thứ còn lại chỉ giữ dấu vết về người đã bị xóa."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ảnh và hồ sơ không khớp. Bạn phải quyết định: giữ gìn ký ức của Linh, hay giữ hồ sơ làm bằng chứng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_check_desk",
            "property": "display",
            "value": "hide"
          }
        ]
      }
    },
    "action_decode_roster": {
      "meta": {
        "title": "Sơ đồ chỗ ngồi",
        "buttonLabel": "Đối chiếu vị trí",
        "desc": "Đối chiếu sơ đồ chỗ ngồi với bản sao sổ điểm danh được bảo toàn. Khoảng trống giữa các dãy bàn trùng với vị trí học sinh thứ mười hai."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_decode_roster"
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
            "type": "set",
            "subtype": "action",
            "target": "action_decode_roster",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn mới chỉ nhận được thông tin mơ hồ về người thứ mười hai."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster_verified",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_decode_roster"
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
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "bằng chứng"
          }
        ]
      }
    },
    "action_follow_marks": {
      "meta": {
        "title": "Dấu sơn trong rừng",
        "buttonLabel": "Theo dấu đến cuối",
        "desc": "Các vệt sơn trên thân thông xuất hiện theo cặp, có chỗ bị rêu che gần hết. Chúng không phải dấu đánh dấu đường đi thông thường: khoảng cách giữa các vệt thay đổi theo hướng rẽ và dẫn đến một khoảng đất trống khuất sau sườn dốc. Từ đó có thể nhìn thấy vòng cọc gỗ giữa rừng."
      },
      "set": {
        "display": "show",
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "text": "Bạn đã tìm được lối an toàn xuyên rừng."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_follow_marks",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Những vệt sơn dẫn bạn đi như lời nhắn của người còn sống. Không cần giấy tờ, con đường vẫn ở đó.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "ký ức"
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Các vệt sơn khớp với tuyến sơ tán trong hồ sơ. Một đoạn đường đã bị gạch khỏi bản đồ chính thức.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "bằng chứng"
                }
              ]
            }
          }
        ]
      }
    },
    "action_maze_path": {
      "meta": {
        "title": "Mê cung trong rừng",
        "buttonLabel": "Giải mê cung",
        "desc": "Lối mòn trong rừng thay đổi vị trí mỗi khi bạn quay đi, khiến các dấu cây quen thuộc không còn đáng tin. La bàn của người dẫn đường có khắc một tuyến ô vuông cố định; đường đúng phải nối các ô liền kề từ cổng rừng đến khoảng đất trống, không được tự ý cắt qua những ô không có dấu."
      },
      "set": {
        "display": "show",
        "password": "find_way:pw_forest",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_maze_path"
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
            "text": "Bạn đã vượt qua mê cung. Phía trước là kho hồ sơ."
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
            "type": "effect",
            "ref": "consume_action_maze_path"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Không có la bàn, những lối mòn cứ dẫn bạn vòng trở lại. Dấu sơn đã không còn đủ để xác định hướng đi."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "guide_compass"
            ]
          }
        ]
      }
    },
    "action_inspect_stakes": {
      "meta": {
        "title": "Vòng cọc gỗ",
        "buttonLabel": "Đếm bóng cọc",
        "desc": "Mười hai cọc gỗ cắm thành một vòng cung trên nền đất cứng. Ánh sáng chỉ tạo ra mười một chiếc bóng, dù không có cọc nào bị gãy hay nghiêng khỏi mặt đất. Khoảng trống không bóng nằm đúng vị trí trung tâm của vòng cung, như thể nơi đó dành cho một người mà ngôi làng không còn nhớ."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_stakes",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Vòng cọc thiếu mất người thứ mười hai. Người này là ai nhỉ?",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "knows_twelve",
                  "op": "==",
                  "value": false
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Tôi nhìn bãi cọc và chiếc cọc gỗ trống tại vị trí thứ mười hai cảm thấy nghẹn lại.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "knows_twelve",
                  "op": "==",
                  "value": true
                }
              ]
            }
          }
        ]
      }
    },
    "action_find_hidden_box": {
      "meta": {
        "title": "Hộp chôn dưới đất",
        "buttonLabel": "Đào và mở hộp",
        "desc": "Một hộp gỗ được chôn gần vòng cọc, nắp đóng kín và trên mặt có dấu niêm phong của đội sơ tán. Phù hiệu kim loại tìm thấy dưới giếng mang cùng ký hiệu, cho biết đây là vật chứng được chôn có chủ ý chứ không phải đồ thất lạc. Bên trong hộp là những mảnh ảnh gia đình bị xé rời, cần ghép lại để nhận diện đứa trẻ."
      },
      "set": {
        "display": "show",
        "password": "puzzle:pw_photo",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_find_hidden_box"
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
            "text": "Trong bức ảnh đã ghép đủ, Linh đứng giữa những người mất tích."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_hidden_box",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_stakes",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_find_hidden_box"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn vẫn chưa tìm thấy phù hiệu đội sơ tán. Dấu niêm phong có thể giúp xác định chiếc hộp này trước khi mở."
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
        "title": "Cối xay nước",
        "buttonLabel": "Khởi động lại",
        "desc": "Cối xay cần chốt truyền động, lò xo và bộ dụng cụ còn đủ tốt. Dấu vết trong ký ức hoặc mảnh bản đồ đều có thể giúp bạn biết cách sửa."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_repair_mill"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_powered",
            "value": true
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cối xay quay trở lại. Một mảnh ký ức cũng theo đó trở về."
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "resolve",
            "field": "current",
            "mode": "add",
            "value": 1
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_repair_mill"
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
            "value": "clockwork_spring"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "mill_gear_pin"
            ]
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "op": "<",
            "value": 2
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "clockwork_spring",
            "op": "<",
            "value": 2
          }
        ]
      }
    },
    "action_inspect_tunnel_names": {
      "meta": {
        "title": "Danh sách tên trên tường đường hầm",
        "buttonLabel": "Đối chiếu số người",
        "desc": "Các bức tường đường hầm phủ kín tên người và ngày tháng. Những dòng chữ được sắp theo thứ tự biến mất chứ không theo họ tên; một số đoạn đã bị cạo sửa, đặc biệt ở cuối danh sách. Đối chiếu các tên cho thấy có mười hai người, không phải mười một."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "text": "Những cái tên trên tường khớp với sơ đồ và mảnh bản đồ. Bạn đã nhận ra danh tính người thứ mười hai—cái tên bị xóa khỏi mọi hồ sơ chính thức."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_tunnel_names",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Bạn đã nhớ ra cái tên ấy. Nhưng những gì được giữ lại trên tường đường hầm sẽ không được đưa vào hồ sơ công khai.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "ký ức"
                }
              ]
            }
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "info",
            "text": "Danh tính người thứ mười hai đã được xác định. Những dấu vết trên tường, sơ đồ và mảnh bản đồ khớp với nhau—đây là bằng chứng về người đã bị xóa khỏi hồ sơ.",
            "req": {
              "logic": "AND",
              "check": [
                {
                  "type": "state",
                  "property": "school_choice",
                  "op": "==",
                  "value": "bằng chứng"
                }
              ]
            }
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "memory_reward_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "knows_twelve",
            "value": true
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_roster_verified",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "map_fragment"
          }
        ]
      }
    },
    "action_open_archive": {
      "meta": {
        "title": "Tủ hồ sơ dưới đê",
        "buttonLabel": "Mở khóa",
        "desc": "Tủ hồ sơ dưới đê lưu bản ghi sơ tán. Sau khi tìm được dấu đường hầm và chọn cách điều tra, chìa khóa sẽ giúp bạn tiếp cận kho tư liệu."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_partial",
            "value": false
          },
          {
            "type": "effect",
            "ref": "consume_action_open_archive"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tủ hồ sơ mở ra. Bản ghi sơ tán giờ có thể được đối chiếu."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_archive_lock",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive_from_evidence",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_open_archive"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": false
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "archive_key"
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "!=",
            "value": "chưa quyết định"
          }
        ]
      }
    },
    "action_confront_voice": {
      "meta": {
        "title": "Tín hiệu dưới ga",
        "buttonLabel": "Trả lời tín hiệu",
        "desc": "Từ đường ray vang lên một tín hiệu méo tiếng, lặp lại nhịp phát thanh từng phát ở quảng trường. Cuộn tinh thể thu sóng lấy từ hộp loa có thể dò lại đúng tần số để tách giọng nói khỏi nhiễu. Đằng sau tín hiệu là một câu hỏi không chỉ về việc ai được cứu, mà còn về ký ức nào sẽ được giữ lại."
      },
      "set": {
        "display": "hide",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_confront_voice",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "item",
            "subtype": "remove",
            "target": "radio_crystal"
          },
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_voice"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "identity_verified_partial",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "notify",
            "title": "Tần số chưa ổn định",
            "level": "warning",
            "text": "Bạn nhận ra cuộn tinh thể đang phát ra dao động cùng tần số với radio. Tuy nhiên, khi nó còn nằm trong túi, tín hiệu vẫn quá yếu để tách giọng nói khỏi nhiễu. Có lẽ cầm nó lên xem thử?",
            "req": {
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
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "radio_crystal"
            ]
          }
        ]
      }
    },
    "action_choose_fate": {
      "meta": {
        "title": "Giải phóng tại sân ga",
        "buttonLabel": "Giải phóng",
        "desc": "Cả ký ức lẫn những bằng chứng bạn thu thập đều có thể dẫn đến giải phóng. Những gì bạn đã tìm được sẽ quyết định cách sự thật được hé lộ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "warning",
            "text": "Những dấu mốc cần thiết vẫn chưa hoàn tất. Hãy tiếp tục đối chiếu hồ sơ, khôi phục các dấu vết và xác nhận những gì ký ức còn giữ lại."
          }
        ]
      },
      "requirement": {
        "logic": "OR",
        "check": [
          {
            "logic": "AND",
            "check": [
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
                "type": "state",
                "property": "evidence_evacuation_seal",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_hymn",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_stakes",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_tunnel",
                "op": "==",
                "value": true
              }
            ]
          },
          {
            "logic": "AND",
            "check": [
              {
                "type": "state",
                "property": "school_choice",
                "op": "==",
                "value": "ký ức"
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
                "type": "state",
                "property": "clue_tunnel",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_hymn",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_stakes",
                "op": "==",
                "value": true
              }
            ]
          }
        ]
      }
    },
    "action_ending_bury": {
      "meta": {
        "title": "Hồ sơ sơ tán",
        "buttonLabel": "Phá hủy hồ sơ",
        "desc": "Hồ sơ sơ tán nằm trước mặt bạn, ghi lại những cái tên mà ngôi làng đã cố quên. Đốt hoặc phá hủy chúng sẽ giữ nguyên sự yên ổn giả tạo hiện tại, nhưng cũng xóa đi cơ hội để những người bị loại khỏi ký ức được thừa nhận. Đây là lựa chọn khép lại sự việc bằng cách chôn sự thật thêm một lần nữa."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "warning",
            "text": "Cuốn sổ khách vẫn chưa được tìm thấy. Bạn chưa biết hồ sơ nào đang bị che giấu để quyết định."
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
        "title": "Tiếng vọng thứ mười hai",
        "buttonLabel": "Ở lại và lắng nghe",
        "desc": "Tiếng vọng thứ mười hai không phải một bản ghi thông thường. Giữa những tiếng nhiễu, bạn nghe thấy giọng của người mà mình luôn tin tưởng nhất. Bản ghi chứa lời thú nhận về người thứ mười hai — và một việc kinh hoàng mà người ấy đã làm, nhưng chưa từng kể cho bạn."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "warning",
            "text": "Bạn cần biết về người thứ mười hai, cùng một lời kể, lời khai hoặc bằng chứng thay thế."
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
            "logic": "OR",
            "check": [
              {
                "type": "state",
                "property": "voice_revealed",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "identity_verified_partial",
                "op": "==",
                "value": true
              }
            ]
          }
        ]
      }
    },
    "action_ending_depart": {
      "meta": {
        "title": "Chuyến tàu 03:17",
        "buttonLabel": "Lên tàu",
        "desc": "Chuyến tàu 03:17 dừng ở sân ga không có trên bản đồ. Tấm vé chưa bị xé là bằng chứng duy nhất cho phép bạn bước lên, nhưng nó không nói rõ chuyến tàu sẽ đưa ai đi và bỏ ai lại. Rời khỏi làng có thể chấm dứt hành trình của bạn mà không giải quyết những điều đã xảy ra."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
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
            "level": "warning",
            "text": "Vé tàu chưa đủ. Bạn cần xác minh chuyến 03:17 từ bản kê hành khách."
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
          },
          {
            "logic": "OR",
            "check": [
              {
                "type": "state",
                "property": "ticket_verified",
                "op": "==",
                "value": true
              }
            ]
          }
        ]
      }
    },
    "action_village_square": {
      "meta": {
        "title": "Quảng trường làng",
        "buttonLabel": "Vào quảng trường",
        "buttonIcon": "location_city",
        "desc": "Quảng trường nằm giữa ngôi làng, nơi bảng thông báo và chiếc loa phát thanh vẫn hoạt động dù không còn ai tụ tập. Ánh đèn vàng yếu ớt hắt xuống nền đá ướt, còn những cái tên bị đọc lên từ loa dường như đang vọng ra từ chính các ngôi nhà quanh quảng trường."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_village_square"
          }
        ]
      }
    },
    "action_enter_well": {
      "meta": {
        "title": "Giếng đá",
        "buttonLabel": "Tiến xuống",
        "buttonIcon": "water_drop",
        "desc": "Giếng đá nằm sát quảng trường, phủ rêu và có những vết khắc mới trên thành. Từ mặt nước vọng lên tiếng gõ đều đặn, dù không thấy ai ở dưới. Con đường ngắn từ bảng thông báo dẫn thẳng đến nơi dấu vết của người thứ mười hai bị che giấu."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_village_well"
          }
        ]
      }
    },
    "action_enter_tower": {
      "meta": {
        "title": "Tháp chuông",
        "buttonLabel": "Leo lên",
        "buttonIcon": "stairs",
        "desc": "Cầu thang hẹp dẫn từ gian cầu nguyện lên tháp chuông. Trên đó treo quả chuông đã câm lặng suốt mười bảy năm, bên cạnh là mặt đồng hồ dừng ở thời điểm liên quan đến vụ mất tích. Cơ cấu bên trong vẫn còn dấu vết của lần tháo dỡ có chủ ý."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel_tower"
          }
        ]
      }
    },
    "action_enter_clearing": {
      "meta": {
        "title": "Khoảng đất trống",
        "buttonLabel": "Tiến vào",
        "buttonIcon": "park",
        "desc": "Khoảng đất trống nằm sâu trong rừng, nơi các vệt sơn hội tụ thành một vòng cọc gỗ. Mười hai cọc được dựng thành hình cung, cạnh đó là dấu đất mới xới cho thấy có vật chứng bị chôn xuống."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_forest_clearing"
          }
        ]
      }
    },
    "action_enter_watermill": {
      "meta": {
        "title": "Cối xay nước",
        "buttonLabel": "Đến cối xay nước",
        "buttonIcon": "water",
        "desc": "Lối rẽ phía Bắc dẫn tới cối xay cũ nép bên dòng suối đã cạn. Bánh xe và phòng máy có thể hé lộ cơ cấu mở đường hầm dưới chân đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_watermill"
          }
        ]
      }
    },
    "action_travel_inn": {
      "meta": {
        "title": "Nhà trọ Bà Hạnh",
        "buttonLabel": "Đi vào",
        "buttonIcon": "hotel",
        "desc": "Nhà trọ Bà Hạnh nằm trên con đường lát đá rời quảng trường. Đây là nơi lưu cuốn sổ khách, lời khai về căn phòng thứ bảy và lối xuống hầm rượu bị giấu sau quầy lễ tân."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_inn"
          }
        ]
      }
    },
    "action_travel_chapel": {
      "meta": {
        "title": "Nhà nguyện",
        "buttonLabel": "Đến nhà nguyện",
        "buttonIcon": "church",
        "desc": "Nhà nguyện nằm cuối con đường nơi tiếng chuông đã im bặt từ mười bảy năm trước. Bản thánh ca trong gian cầu nguyện giữ mật từ và quy tắc ba hồi chuông cần thiết để hiểu chuyện gì đã xảy ra."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_chapel"
          }
        ]
      }
    },
    "action_travel_school": {
      "meta": {
        "title": "Trường học bỏ hoang",
        "buttonLabel": "Đến trường học",
        "buttonIcon": "school",
        "desc": "Trường tiểu học bỏ hoang nằm bên con đường có những dấu chân nhỏ dẫn vào lớp số 3. Hồ sơ lớp học và bức ảnh bị xé là những bằng chứng quan trọng về người thứ mười hai."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_abandoned_school"
          }
        ]
      }
    },
    "action_enter_classroom_03": {
      "meta": {
        "title": "Lớp học số 3",
        "buttonLabel": "Bước vào",
        "buttonIcon": "door_open",
        "desc": "Theo dấu chân nhỏ dọc hành lang, bạn bước vào lớp học số 3. Những dãy bàn thấp phủ bụi vẫn được xếp ngay ngắn. Bục giảng, bảng đen, cửa sổ và chiếc đồng hồ đứng im hiện ra trong ánh sáng xám lọt qua rèm cửa."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_school_classroom_03"
          }
        ]
      }
    },
    "action_examine_blackboard": {
      "meta": {
        "title": "Bảng đen",
        "buttonLabel": "Quan sát dấu phấn",
        "desc": "Bạn tiến lại gần bảng đen. Những vệt phấn mờ nằm dưới lớp bụi, nhưng từ khoảng cách này chưa thể đọc được nội dung. Tập trung quan sát bảng để nhìn rõ các dấu vết."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_classroom_blackboard"
          }
        ]
      }
    },
    "action_read_blackboard": {
      "meta": {
        "title": "Những dòng chữ bị cạo",
        "buttonLabel": "Đọc phần còn sót",
        "desc": "Bạn nghiêng người nhìn sát mặt bảng. Dưới những vệt lau chồng lên nhau vẫn còn nét phấn của một danh sách học sinh. Một vị trí bị cạo mạnh đến mức mặt bảng xước thành những đường trắng. Đây là hành động xóa dấu vết có chủ ý, không phải bụi thời gian."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_decode_roster",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_class_register",
            "property": "display",
            "value": "show"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_erased"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Danh sách lớp bị xóa không phải tai nạn. Những dấu vết mới đang mở ra."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "memory_reconstructed",
            "value": true
          }
        ]
      }
    },
    "action_inspect_student_seat": {
      "meta": {
        "title": "Dãy bàn học sinh",
        "buttonLabel": "Tìm dấu khắc",
        "desc": "Ở dãy bàn gần cuối lớp, một chiếc ghế bị kéo lệch khỏi hàng. Mặt bàn phía trước có những vết khắc nhỏ, trong đó số mười hai bị cào đi nhiều lần. Bụi quanh chân ghế cho thấy nó từng được di chuyển sau khi lớp học đã bỏ trống."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_seat_mark",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_student_seat",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dấu khắc trên bàn cho thấy chỗ của học sinh thứ mười hai."
          }
        ]
      }
    },
    "action_inspect_class_clock": {
      "meta": {
        "title": "Đồng hồ treo tường",
        "buttonLabel": "Đọc thời điểm dừng",
        "desc": "Chiếc đồng hồ tròn đã ngừng chạy. Kim phút dừng ở số mười bảy, còn kim giờ nằm sát số ba. Mặt kính không vỡ và bộ kim không bị cong; đồng hồ có vẻ đã bị dừng đúng vào 03:17."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_class_clock",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_class_clock",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Chiếc đồng hồ trong lớp dừng ở 03:17."
          }
        ]
      }
    },
    "action_inspect_evacuation_notice": {
      "meta": {
        "title": "Thông báo sơ tán",
        "buttonLabel": "Xác nhận sĩ số",
        "desc": "Tờ thông báo cũ ghim cạnh cửa sổ ghi ngày sơ tán của trường. Phần danh sách lớp đã nhòe nước, nhưng dòng tổng sĩ số vẫn đọc được: mười hai học sinh. Mép giấy có dấu ghim thứ hai, như thể từng có một phụ lục bị tháo đi."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_evacuation_notice",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Sĩ số được xác nhận: mười hai học sinh."
          }
        ]
      }
    },
    "action_travel_forest": {
      "meta": {
        "title": "Rừng thông phía Bắc",
        "buttonLabel": "Vào rừng",
        "buttonIcon": "forest",
        "desc": "Rừng thông phía Bắc bắt đầu ở rìa làng, nơi những vệt sơn lặp lại trên thân cây. Con đường ở đây không ổn định, nhưng các dấu mốc dẫn đến khoảng đất nghi lễ và tuyến xuống chân đê."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_north_forest"
          }
        ]
      }
    },
    "action_reach_station": {
      "meta": {
        "title": "Ga tàu 03:17",
        "buttonLabel": "Tiến vào",
        "buttonIcon": "train",
        "desc": "Ga tàu 03:17 không xuất hiện trên bản đồ làng và chỉ hiện ra ở cuối tuyến đường hầm. Những manh mối về cuộc sơ tán, danh sách vận chuyển và kho hồ sơ phải được ghép lại trước khi có thể tìm thấy sân ga."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
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
            "level": "warning",
            "text": "Sân ga vẫn chưa hiện ra. Kho hồ sơ, danh sách vận chuyển và cuộn phim sơ tán còn phải được tìm thấy; thánh ca, vòng cọc và đường hầm cũng chưa thể bỏ qua."
          }
        ]
      },
      "requirement": {
        "ref": "station_ready"
      }
    },
    "action_reach_station_memory": {
      "meta": {
        "title": "Ga tàu 03:17 — theo ký ức",
        "buttonLabel": "Theo dấu ký ức",
        "buttonIcon": "train",
        "desc": "Bạn lần theo lời khai và những dấu vết trong đường hầm, không cần dựa vào danh sách vận chuyển hay cuộn phim."
      },
      "set": {
        "display": "hide",
        "requirement": true
      },
      "effect": {
        "normal": [],
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
            "level": "warning",
            "text": "Con đường ký ức vẫn chưa mở. Kho hồ sơ, đường hầm, thánh ca và vòng cọc thứ mười hai đang chờ được tìm thấy."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "ký ức"
          },
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_descend_tunnel": {
      "meta": {
        "title": "Đường hầm dưới cối xay",
        "buttonLabel": "Mở cửa sập",
        "buttonIcon": "south",
        "desc": "Cửa sập nằm dưới sàn cối xay, nối phòng máy với đường hầm dưới chân đê. Một hệ đối trọng giữ cánh cửa khóa chặt khi bánh xe đứng yên; khi trục truyền động hoạt động, sức kéo mới đủ nâng cửa và để lộ bậc thang đi xuống."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
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
            "level": "warning",
            "text": "Cửa sập không nhúc nhích. Cối xay hoặc dấu đường hầm có thể giúp mở lối xuống."
          }
        ]
      },
      "requirement": {
        "logic": "OR",
        "check": [
          {
            "type": "state",
            "property": "mill_powered",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_restore_radio_signal": {
      "meta": {
        "title": "Khôi phục tín hiệu phát thanh (tùy chọn)",
        "buttonLabel": "Sửa mạch điện",
        "desc": "Bạn có thể thử sửa mạch bằng bộ dụng cụ, dây, cầu chì và tinh thể còn đủ tốt. Việc này không ảnh hưởng đến con đường chính; cuộn tinh thể vẫn có thể giúp dò tín hiệu dưới ga."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_crystal"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "insulated_wire"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_fuse"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "op": "<",
            "value": 2
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_crystal",
            "op": "<",
            "value": 1
          }
        ]
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_restore_radio_components"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_restore_radio_signal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tiếng rè dịu dần. Tín hiệu cũ rõ lên, mang theo một giọng nói và dấu vết mới."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "voice_revealed",
            "value": true
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "resolve",
            "field": "current",
            "mode": "add",
            "value": 1
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_restore_radio_components"
          }
        ]
      }
    },
    "action_overlay_map": {
      "meta": {
        "title": "Đối chiếu bản đồ",
        "buttonLabel": "Chồng giấy can",
        "desc": "Chồng giấy can lên mảnh bản đồ và kiểm tra các ký hiệu. Bản đồ, giấy can và kính lúp cần đủ rõ để xác nhận tuyến phụ dẫn đến khu vực dưới chân đê."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
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
            "value": "tracing_paper"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "inspection_loupe"
          },
          {
            "type": "state",
            "property": "clue_seat_mark",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_class_clock",
            "op": "==",
            "value": true
          }
        ]
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_overlay_map"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_overlay_map",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bản đồ khớp với dấu dưới chân đê. Con đường đã hiện rõ."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_overlay_map"
          }
        ]
      }
    },
    "action_decode_broadcast": {
      "meta": {
        "title": "Mạch phát thanh",
        "buttonLabel": "Lấy tinh thể",
        "desc": "Hộp loa gắn sau bảng thông báo. Tiếng gọi tên dân làng phát đều đặn; sau bảng mạch là cuộn tinh thể lưu tần số. Cần bộ dụng cụ sửa chữa để mở mạch và lấy linh kiện an toàn."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          }
        ]
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "radio_crystal"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuộn tinh thể nằm trong tay bạn. Mạch phát thanh đã được giải, và quảng trường đổi khác."
          }
        ]
      }
    },
    "action_retrieve_well_badge": {
      "meta": {
        "title": "Phù hiệu đội sơ tán",
        "buttonLabel": "Nhặt lên",
        "desc": "Một vật kim loại mắc trong hốc đá dưới mực nước cũ, chỉ lộ ra sau khi ánh đèn bão soi đúng góc và làm hiện đường viền của hốc. Mép phù hiệu bị bám cặn nhưng ký hiệu đội sơ tán vẫn còn nguyên, trùng với dấu niêm phong trên chiếc hộp chôn trong rừng."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "well_badge"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn lấy được phù hiệu đội sơ tán từ hốc giếng."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_well",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_lantern",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_find_spare_key": {
      "meta": {
        "title": "Chìa khóa phòng thứ bảy",
        "buttonLabel": "Thu thập",
        "desc": "Ngăn kéo sau quầy lễ tân chứa chìa khóa đồng số bảy. Việc tìm được chìa khóa xác nhận căn phòng thứ bảy tồn tại, nhưng chưa mở cửa. Bạn phải chọn mở sạch, cưỡng chế hoặc tìm cách bypass."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "spare_room_key"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_confirmed",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_hidden_room",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_spare_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_confirm_room7",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Chìa khóa phòng thứ bảy đã tìm thấy. Cánh cửa vẫn đóng—hãy xác minh căn phòng rồi chọn cách mở."
          }
        ],
        "fail": []
      }
    },
    "action_find_evacuation_film": {
      "meta": {
        "title": "Cuộn phim sơ tán",
        "buttonLabel": "Lấy cuộn phim",
        "desc": "Hộp thiếc nằm khuất sau kệ rượu, được bọc để tránh ẩm và bụi. Cuộn phim bên trong ghi lại đám đông tập trung ở bờ đê trước đêm mất điện, cung cấp hình ảnh đối chứng cho danh sách vận chuyển và lời kể trong cuộn băng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuộn phim sơ tán đã được tìm thấy. Nó có thể giúp xác nhận những gì hồ sơ bỏ sót."
          }
        ]
      }
    },
    "action_find_hymn_note": {
      "meta": {
        "title": "Ghi chú trong thánh ca",
        "buttonLabel": "Mở phần gáy",
        "desc": "Phần gáy bản thánh ca dày hơn các trang còn lại và có đường chỉ khâu không đồng màu. Bên trong là một trang ghi chú được gấp nhỏ, giải thích ý nghĩa của ba hồi chuông và vì sao hồi thứ tư không được vang lên."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "hymn_note"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy ghi chú về ba hồi chuông—và lời cảnh báo đừng bao giờ rung hồi thứ tư."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_hymn",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "hymn_partial",
            "value": false
          }
        ]
      }
    },
    "action_recover_bell_wire": {
      "meta": {
        "title": "Dây đồng chuông",
        "buttonLabel": "Thu hồi",
        "desc": "Đoạn dây đồng còn mắc quanh bánh răng của cơ cấu chuông, một đầu bị tuột khỏi trục truyền lực. Dấu xoắn trên dây cho thấy nó từng được tháo ra chứ không tự đứt; đoạn dây này có thể nối lại bộ phận truyền động trên tháp."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "bell_copper_wire"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dây đồng chuông đã được lấy ra. Cơ cấu giờ có thêm một phần cần thiết."
          }
        ]
      }
    },
    "action_recover_class_register": {
      "meta": {
        "title": "Sổ điểm danh",
        "buttonLabel": "Bảo toàn hồ sơ",
        "desc": "Bạn quyết định giữ bản sao sổ điểm danh như bằng chứng có thể đối chiếu, dù việc này khiến Linh không còn muốn chia sẻ toàn bộ ký ức riêng."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "school_choice",
            "value": "bằng chứng"
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "class_register_copy"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_class_register",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_talk_linh",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reach_station",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_choose_fate",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_decode_roster",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_overlay_map",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reach_station_memory",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_choose_fate",
            "property": "display",
            "value": "show"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_classroom_archive_open"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn giữ lại bản sao sổ điểm danh. Linh khép lại một phần ký ức, nhưng những dấu vết khác vẫn còn."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_photo",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "chưa quyết định"
          }
        ]
      }
    },
    "action_collect_forest_compass": {
      "meta": {
        "title": "La bàn người dẫn đường",
        "buttonLabel": "Nhặt lên",
        "desc": "La bàn cũ mắc dưới gốc cây có hai vệt sơn song song. Mặt sau khắc tuyến đường từ rừng xuống chân đê, cho thấy người dẫn đường từng dùng nó để đưa người qua địa hình thay đổi mà không phụ thuộc vào lối mòn."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "guide_compass"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "La bàn dẫn đường đã tìm thấy. Tuyến xuyên rừng giờ có thể được xác định."
          }
        ]
      }
    },
    "action_find_wooden_seal": {
      "meta": {
        "title": "Con dấu đội sơ tán",
        "buttonLabel": "Thu thập",
        "desc": "Phiến đá nằm giữa vòng cọc có mép bị xê dịch, để lộ một hốc đất nhỏ bên dưới. Trong hốc là con dấu gỗ của đội sơ tán, vật từng dùng để xác nhận danh sách chính thức trước khi niêm phong hồ sơ."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Con dấu đội sơ tán nằm trong tay bạn—dấu xác nhận của danh sách chính thức."
          }
        ]
      }
    },
    "action_recover_tunnel_manifest": {
      "meta": {
        "title": "Danh sách vận chuyển",
        "buttonLabel": "Thu thập",
        "desc": "Ống tài liệu được giấu sau một viên gạch rỗng trong đường hầm và có lớp bọc chống ẩm. Danh sách bên trong ghi tên những người được vận chuyển qua đây theo từng lượt, cung cấp bằng chứng trực tiếp về tuyến sơ tán mà hồ sơ làng đã phủ nhận."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "tunnel_manifest"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Danh sách vận chuyển trong đường hầm đã được tìm thấy."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "manifest_partial",
            "value": false
          }
        ]
      }
    },
    "action_find_station_ticket": {
      "meta": {
        "title": "Vé tàu 03:17",
        "buttonLabel": "Nhặt lên",
        "desc": "Dưới hàng ghế chờ có một khe gỗ bị bung khỏi khung, đủ rộng để giấu một tấm vé. Vé tàu bên trong vẫn còn nguyên phần kiểm soát, mang giờ khởi hành 03:17 và là bằng chứng rằng sân ga từng phục vụ một chuyến tàu thực sự."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "unpunched_ticket"
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
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Vé tàu 03:17 đã tìm thấy. Chuyến tàu ấy từng tồn tại."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "ticket_verified",
            "value": false
          }
        ]
      }
    },
    "action_talk_linh": {
      "meta": {
        "title": "Lời khai riêng của Linh",
        "buttonLabel": "Bảo vệ lời khai",
        "desc": "Bạn quyết định không biến ký ức của Linh thành vật chứng công khai. Lời khai riêng và những chi tiết em nhớ sẽ là con đường tiếp tục điều tra."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "chat",
            "target": "chat_linh"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_photo",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "==",
            "value": "chưa quyết định"
          }
        ]
      }
    },
    "action_confirm_room7": {
      "meta": {
        "title": "Xác minh phòng thứ bảy",
        "buttonLabel": "Đối chiếu sổ khách",
        "desc": "Sổ khách và lời Bà Hạnh cho thấy phòng thứ bảy bị bỏ khỏi sơ đồ. Xác minh trước khi thao tác cửa."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_confirmed",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_unlock_room7",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_room7",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_confirm_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn đã xác nhận căn phòng thứ bảy. Cánh cửa có thể được mở theo cách bạn chọn."
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Trước hết, hãy tìm cuốn sổ khách và đối chiếu những gì nó ghi."
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
          }
        ]
      }
    },
    "action_unlock_room7": {
      "meta": {
        "title": "Mở phòng thứ bảy — an toàn",
        "buttonLabel": "Dùng chìa khóa",
        "desc": "Chìa khóa còn nguyên và cơ cấu khóa không bị hư. Cách mở này không làm hỏng chìa khóa."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_unlock_room7"
          },
          {
            "type": "effect",
            "ref": "open_room7_success"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_unlock_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_room7_alternative",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_room7_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_hidden_room"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Chìa khóa xoay nhẹ. Phòng thứ bảy mở ra mà không làm hỏng ổ khóa."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_unlock_room7"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn cần xác nhận phòng 7, giữ chìa khóa nguyên vẹn và có đủ sức để thử mở; ổ khóa chưa được phá."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "room7_confirmed",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "spare_room_key"
            ]
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "spare_room_key",
            "op": "<",
            "value": 2
          },
          {
            "type": "state",
            "property": "room7_lock_damaged",
            "op": "==",
            "value": false
          }
        ]
      }
    },
    "action_force_room7": {
      "meta": {
        "title": "Cưỡng chế cửa phòng thứ bảy",
        "buttonLabel": "Cạy cửa",
        "desc": "Cưỡng chế có thể làm hỏng chìa khóa, khóa và khiến An mất bình tĩnh. Chỉ thực hiện khi bạn chấp nhận rủi ro."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_force_room7"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_lock_damaged",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_key_damaged",
            "value": true
          },
          {
            "type": "effect",
            "ref": "open_room7_success"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_unlock_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_room7_key",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_room7_alternative",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_damaged_lock",
            "property": "display",
            "value": "show"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_room7_forced"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cánh cửa bị cưỡng mở. Khóa và chìa khóa hư hại; bên trong chỉ lộ ra một phần dấu vết."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_key_broken",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_force_room7"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn chưa đủ sức hoặc dụng cụ để cạy cửa. Chìa khóa vẫn nguyên—hãy tìm bộ dụng cụ và xác nhận căn phòng trước."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "room7_confirmed",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_room_key"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "spare_room_key",
            "op": "<",
            "value": 3
          },
          {
            "type": "stats",
            "subtype": "characters",
            "target": "player",
            "property": "composure",
            "field": "current",
            "op": ">=",
            "value": 1
          }
        ]
      }
    },
    "action_repair_room7_key": {
      "meta": {
        "title": "Chìa khóa phòng thứ bảy",
        "buttonLabel": "Chỉnh chìa khóa",
        "desc": "Đầu chìa số bảy đã cong sau những lần cố mở cửa. Những vết xước cũ vẫn còn nguyên, nhưng các rãnh kim loại có thể vừa khít với ổ khóa thêm một lần nữa."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "usage",
            "target": "spare_room_key",
            "value": -1
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_key_broken",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_key_damaged",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_lock_damaged",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_room7_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_room7_alternative",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_unlock_room7",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_room7",
            "property": "display",
            "value": "show"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_room7_repaired"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Chìa khóa được chỉnh lại. Bạn có thêm sức, nhưng lần sử dụng đã mất và dấu hư hại cũ vẫn còn."
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn cần chìa khóa, bộ dụng cụ và biết ổ khóa đã hư đến đâu trước khi thử."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "room7_key_damaged",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_room_key"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          }
        ]
      }
    },
    "action_open_room7_alternative": {
      "meta": {
        "title": "Mở phòng thứ bảy bằng cách khác",
        "buttonLabel": "Thử mở cửa bằng cách khác",
        "desc": "Dựa vào dấu khóa, sơ đồ hoặc bộ dụng cụ để mở cửa khi chìa khóa không còn dùng được. Những manh mối tìm được có thể vẫn chưa đầy đủ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_open_room7_alternative"
          },
          {
            "type": "effect",
            "ref": "open_room7_success"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_room7_alternative",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_room7_key",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_unlock_room7",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_inn_hidden_room"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Một cách mở khác đã thành công. Những vết trên ổ khóa và dấu còn lại giúp bạn kiểm chứng điều mình nghi ngờ."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_open_room7_alternative"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Chỉ có thể thử cách mở khác khi chìa khóa đã gãy, căn phòng được xác nhận và bộ dụng cụ ở trong tay."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "room7_confirmed",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "room7_key_broken",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          }
        ]
      }
    },
    "action_inspect_damaged_lock": {
      "meta": {
        "title": "Kiểm tra khóa bị hư",
        "buttonLabel": "Kiểm tra ổ khóa",
        "desc": "Quan sát vết cạy, đầu chìa và dấu mài để tìm cách mở cửa khác. Việc kiểm tra không làm dụng cụ hao mòn."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_room7_alternative",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_inspect_damaged_lock",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Vết cạy trên cửa cho thấy ai đó từng mở căn phòng trái phép. Hãy đối chiếu sơ đồ hoặc tìm cách mở khác."
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Dấu này chỉ hiện ra khi ổ khóa đã bị hư."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "room7_lock_damaged",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_dry_guestbook": {
      "meta": {
        "title": "Sổ khách bị ẩm",
        "buttonLabel": "Làm khô sổ",
        "desc": "Hơi ẩm đã khiến những dòng chữ trên trang giấy nhòe đi. Một vài cái tên chỉ còn hiện ra dưới ánh đèn, trong khi mực ở những trang cuối dường như vẫn chưa khô hẳn."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "usage",
            "target": "guestbook",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "guestbook_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "room7_confirmed",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_dry_guestbook",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuốn sổ khách đã sáng tỏ hơn. Phòng thứ bảy được xác nhận."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "guestbook_partial",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guestbook"
          }
        ]
      }
    },
    "action_compare_guestbook_photo": {
      "meta": {
        "title": "Đối chiếu sổ khách với ảnh",
        "buttonLabel": "Đối chiếu",
        "desc": "Dùng ảnh lớp hoặc cuộn phim để xác minh cái tên bị mất khỏi sổ khách."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "verify_room7"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "guestbook_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_compare_guestbook_photo",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Một nguồn độc lập cũng xác nhận phòng thứ bảy."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "guestbook_partial",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "class_photo"
          }
        ]
      }
    },
    "action_observe_mai": {
      "meta": {
        "title": "Quan sát Mai từ xa",
        "buttonLabel": "Quan sát",
        "desc": "Bạn không tiến lại gần Mai. Từ phía bên kia quảng trường, cô nhiều lần nhìn về giếng rồi nhanh chóng quay đi. Khi loa phát thanh rè lên, Mai kiểm tra mảnh giấy gấp trong tay. Có điều gì đó khiến cô không muốn đối diện với giếng, nhưng bạn chưa thể biết đó là gì."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "mai_approach",
            "value": "quan sát"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_mai_observation",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_observe_mai",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_talk_mai",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mai khẽ nhìn về phía giếng rồi quay đi. Mảnh giấy trong tay cô bị vò chặt hơn."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "mai_approach",
            "op": "==",
            "value": "chưa tiếp cận"
          }
        ]
      }
    },
    "action_listen_mai_tape": {
      "meta": {
        "title": "Nghe lại băng của Mai",
        "buttonLabel": "Nghe băng",
        "desc": "Cuộn băng được bọc trong giấy dầu, nhãn ghi ngày đêm mất điện. Khi phát lại, giữa tiếng rè có một tín hiệu ngắn lặp lại. Lời ghi âm có thể hé lộ điều Mai chưa muốn nói trực tiếp."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_listen_mai_tape"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_listen_mai_tape",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuộn băng mang đến lời kể từ xa, không phải cuộc trò chuyện trực tiếp."
          }
        ],
        "fail": []
      },
      "requirement": {
        "ref": "tape_available"
      }
    },
    "action_verify_guestbook": {
      "meta": {
        "title": "Xác minh sổ khách",
        "buttonLabel": "Đối chiếu sổ",
        "desc": "Đối chiếu sổ khách với cuộn phim hoặc ảnh lớp để xác minh căn phòng thứ bảy."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "verify_room7"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_guestbook",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuốn sổ khách đã được đối chiếu với một nguồn khác."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
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
            "value": "evacuation_film"
          }
        ]
      }
    },
    "action_follow_compass_uncertain": {
      "meta": {
        "title": "Theo la bàn không chắc chắn",
        "buttonLabel": "Theo dấu mờ",
        "desc": "La bàn chỉ hướng không thật chính xác. Đi theo nó có thể làm la bàn xuống cấp, khiến bạn khó giữ phương hướng và mất bình tĩnh."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_follow_compass_uncertain"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "forest_route_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_follow_compass_uncertain",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_forest_route",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Một đoạn đường rừng mới hiện ra. Dấu chân, bản đồ hoặc lời kể có thể cho biết nó dẫn đến đâu."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_follow_compass_uncertain"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "La bàn phải ở trong tay bạn mới có thể lần theo hướng này."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "guide_compass"
            ]
          }
        ]
      }
    },
    "action_verify_forest_route": {
      "meta": {
        "title": "Xác minh tuyến rừng",
        "buttonLabel": "Đối chiếu tuyến",
        "desc": "Những vệt sơn trong rừng, cái tên trên tường đường hầm và danh sách vận chuyển dường như cùng chỉ về một hướng. Ba dấu vết vốn nằm ở những nơi cách xa nhau lại đang kể cùng một câu chuyện."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "forest_route_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_forest_route",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dấu đường rừng đã được xác nhận bằng bằng chứng."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "forest_route_partial",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_force_seal": {
      "meta": {
        "title": "Cạy niêm phong hộp",
        "buttonLabel": "Cạy niêm phong",
        "desc": "Cạy niêm phong có thể làm hỏng dấu xác thực và khiến bằng chứng mất giá trị."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_force_seal"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "evacuation_seal",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_photo",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_stakes",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_seal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_seal",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Con dấu rách khi chiếc hộp mở ra. Một phần giấy tờ vẫn còn, nhưng vài dòng đã mất."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_force_seal"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Hãy tìm con dấu và bộ dụng cụ để mở hộp mà không làm hỏng thêm giấy tờ."
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
            "value": "evacuation_seal"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          }
        ]
      }
    },
    "action_verify_seal": {
      "meta": {
        "title": "Xác minh con dấu bị hư",
        "buttonLabel": "Đối chiếu con dấu",
        "desc": "Đối chiếu con dấu bị hư với cuộn phim, danh sách vận chuyển hoặc phù hiệu."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_seal",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_seal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuộn phim giúp xác nhận dấu con dấu bị rách."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "usage",
            "target": "evacuation_seal",
            "op": ">",
            "value": 0
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
    "action_repair_mill_partial": {
      "meta": {
        "title": "Sửa cối xay tạm thời",
        "buttonLabel": "Sửa tạm",
        "desc": "Nếu một linh kiện đã xuống cấp, bạn vẫn có thể thử sửa cối xay. Các linh kiện sẽ hao mòn thêm và máy chỉ hoạt động tạm thời."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_repair_mill_partial"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_repaired_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_mill_partial",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_stabilize_mill",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_mill",
            "property": "display",
            "value": "show"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_running"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cối xay chỉ chạy tạm thời. Dấu đường hầm vẫn dẫn tiếp."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_repair_mill_partial"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn còn thiếu dụng cụ, lò xo, chốt truyền động hoặc dấu đường hầm để sửa cối xay."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "clockwork_spring"
          },
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "mill_gear_pin"
            ]
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "op": "<",
            "value": 4
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "clockwork_spring",
            "op": "<",
            "value": 4
          }
        ]
      }
    },
    "action_force_mill_repair": {
      "meta": {
        "title": "Cưỡng ép sửa cối xay",
        "buttonLabel": "Cưỡng ép sửa",
        "desc": "Cố sửa cối xay bằng sức có thể làm hỏng bộ dụng cụ và khiến An mất bình tĩnh."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "action",
            "target": "action_force_mill_repair",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "effect",
            "ref": "consume_action_force_mill_repair"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_damaged",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_stabilize_mill",
            "property": "display",
            "value": "show"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_mill",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cơ cấu không khớp. Bộ dụng cụ quá tải, bạn mất bình tĩnh; vẫn có thể lần theo đường hầm mà không cần cối xay."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_force_mill_repair"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Hãy cầm bộ dụng cụ và tìm đủ linh kiện trước khi thử sửa cơ cấu."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "hand",
            "op": "==",
            "value": [
              "radio_toolkit"
            ]
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "clockwork_spring"
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
    "action_stabilize_mill": {
      "meta": {
        "title": "Giữ cối xay hoạt động tạm thời",
        "buttonLabel": "Ổn định máy",
        "desc": "Dùng linh kiện và bộ dụng cụ để giữ cối xay hoạt động trong thời gian ngắn."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_stabilize_mill"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "clockwork_spring",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_powered",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_repaired_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_stabilize_mill",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_descend_tunnel",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cối xay đã ổn định. Lối chính vẫn thông."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_stabilize_mill"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "mill_repaired_partial",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "clockwork_spring"
          }
        ]
      }
    },
    "action_bypass_mill": {
      "meta": {
        "title": "Đi theo đường hầm, không qua cối xay",
        "buttonLabel": "Đi theo đường hầm",
        "desc": "Bạn có thể lần theo dấu vết dưới chân đê mà không cần khôi phục cối xay. Dấu đường hầm vẫn phải được tìm ra trước khi lối đi hiện rõ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "mill_powered",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_mill",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_descend_tunnel",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn lần theo dấu dưới chân đê, bỏ lại cối xay. Lối xuống đường hầm vẫn còn đó."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_bypass_archive_lock": {
      "meta": {
        "title": "Mở tủ hồ sơ bằng cách khác",
        "buttonLabel": "Mở tủ bằng cách khác",
        "desc": "Dùng bộ dụng cụ và những dấu vết đã tìm được để mở tủ hồ sơ khi chìa khóa không còn. Nếu phải cưỡng ép, giấy tờ bên trong có thể bị rách hoặc thất lạc."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_bypass_archive_lock"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_open",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_archive_lock",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reconstruct_archive_record",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tủ bật mở dưới sức ép. Một vài trang rách mất góc, nhưng phần còn lại vẫn đủ để lần theo dấu người sơ tán."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive_from_evidence",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_bypass_archive_lock"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Hãy tìm dấu đường hầm và bộ dụng cụ, rồi quyết định cách lần theo sự thật trước khi mở tủ."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": false
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "!=",
            "value": "chưa quyết định"
          }
        ]
      }
    },
    "action_reconstruct_archive_record": {
      "meta": {
        "title": "Hồ sơ sơ tán thiếu",
        "buttonLabel": "Tái dựng",
        "desc": "Đối chiếu danh sách đường hầm, cuộn phim và sổ điểm danh để khôi phục bản ghi."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_archive_record"
          },
          {
            "type": "effect",
            "ref": "open_archive"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reconstruct_archive_record",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Danh sách đường hầm, cuộn phim và sổ điểm danh khớp nhau. Những cái tên từng bị xóa đã trở lại hồ sơ."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "corroboration_transport_records",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_archive_record"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "archive_partial",
            "op": "==",
            "value": true
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
    "action_open_archive_from_evidence": {
      "meta": {
        "title": "Mở kho bằng bằng chứng",
        "buttonLabel": "Mở bằng bằng chứng",
        "desc": "Dùng danh sách vận chuyển và cuộn phim để mở kho khi không còn chìa khóa. Những dấu vết dưới đê và lựa chọn điều tra sẽ giúp đối chiếu hồ sơ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "set",
            "subtype": "state",
            "target": "archive_partial",
            "value": false
          },
          {
            "type": "effect",
            "ref": "consume_action_open_archive_from_evidence"
          },
          {
            "type": "effect",
            "ref": "open_archive"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive_from_evidence",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Danh sách, cuộn phim và dấu vết đối chiếu đã giúp bạn mở tủ hồ sơ."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_open_archive",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_bypass_archive_lock",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_open_archive_from_evidence"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": false
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
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
          },
          {
            "type": "state",
            "property": "school_choice",
            "op": "!=",
            "value": "chưa quyết định"
          }
        ]
      }
    },
    "action_retrace_map": {
      "meta": {
        "title": "Tái đối chiếu bản đồ",
        "buttonLabel": "Tái đối chiếu",
        "desc": "Dùng giấy can và kính lúp để khôi phục những phần bản đồ bị thiếu."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "usage",
            "target": "tracing_paper",
            "value": -1
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "inspection_loupe",
            "value": -1
          },
          {
            "type": "effect",
            "ref": "complete_tunnel_route"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_retrace_map",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tuyến đường trên bản đồ đã được xác nhận."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "map_incomplete",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tracing_paper"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "inspection_loupe"
          }
        ]
      }
    },
    "action_compare_evacuation_film": {
      "meta": {
        "title": "Đối chiếu bản đồ bằng cuộn phim",
        "buttonLabel": "Đối chiếu cuộn phim",
        "desc": "Dùng cuộn phim sơ tán để kiểm tra và xác nhận tuyến đường dưới đê."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_compare_evacuation_film"
          },
          {
            "type": "effect",
            "ref": "complete_tunnel_route"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_compare_evacuation_film",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Cuộn phim xác nhận tuyến đường."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_compare_evacuation_film"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "map_incomplete",
            "op": "==",
            "value": true
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
    "action_verify_route_from_radio": {
      "meta": {
        "title": "Xác minh tuyến đường từ radio",
        "buttonLabel": "Đối chiếu tín hiệu",
        "desc": "Dùng bản ghi phát thanh hoặc bằng chứng từ radio để xác nhận tuyến đường trong đường hầm."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "complete_tunnel_route"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_route_from_radio",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tín hiệu xác nhận tuyến đường."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "map_incomplete",
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
    "action_ring_bell_imperfect": {
      "meta": {
        "title": "Rung chuông với cơ cấu chưa hoàn chỉnh",
        "buttonLabel": "Rung chuông",
        "desc": "Bạn chấp nhận cơ cấu chưa hoàn hảo. Dây và các bộ phận sẽ hao mòn, An có thể mất bình tĩnh, còn tiếng chuông sẽ bị méo."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_ring_bell_imperfect"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
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
            "target": "bell_rung_imperfectly",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "bell_signal_distorted",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_ring_bell",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_correct_bell_signal",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Chuông vang lên, nhưng âm thanh méo mó. Dấu vết lần rung chuông vẫn còn; bạn có thể sửa tín hiệu."
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_ring_bell_imperfect",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_ring_bell_imperfect"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Cơ cấu chuông còn thiếu bộ phận và mã xác nhận."
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
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_copper_wire"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "hymn_note"
          },
          {
            "type": "state",
            "property": "heard_bell",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "bell_copper_wire",
            "op": "<",
            "value": 4
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "hymn_note",
            "op": "<",
            "value": 3
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "bell_clapper",
            "op": "<",
            "value": 3
          }
        ]
      }
    },
    "action_correct_bell_signal": {
      "meta": {
        "title": "Sửa tín hiệu chuông",
        "buttonLabel": "Sửa tín hiệu",
        "desc": "Sửa dây dẫn và đối chiếu bài thánh ca để điều chỉnh tiếng chuông bị méo."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_correct_bell_signal"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "hymn_note",
            "value": -1
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "bell_copper_wire",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "bell_signal_distorted",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "bell_rung_imperfectly",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_correct_bell_signal",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Tín hiệu chuông đã được chỉnh lại. Dù vậy, lần rung méo trước đó vẫn để lại dấu vết."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_correct_bell_signal"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "bell_signal_distorted",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "bell_copper_wire"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "hymn_note"
          }
        ]
      }
    },
    "action_restore_hymn_note": {
      "meta": {
        "title": "Tái dựng ghi chú thánh ca",
        "buttonLabel": "Tái dựng",
        "desc": "Đối chiếu bài thánh ca với sổ khách, sổ điểm danh hoặc lời khai của người giữ nhà nguyện."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_restore_hymn_note"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "hymn_note",
            "value": -1
          },
          {
            "type": "effect",
            "ref": "recover_hymn"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_restore_hymn_note",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Những ghi chú trong thánh ca đã được khôi phục."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_restore_hymn_note"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "hymn_partial",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guestbook"
          }
        ]
      }
    },
    "action_restore_radio_signal_partial": {
      "meta": {
        "title": "Khôi phục tín hiệu phát thanh tạm thời",
        "buttonLabel": "Sửa tạm",
        "desc": "Khôi phục tạm tín hiệu bằng bộ dụng cụ, tinh thể, dây và cầu chì. Mạch chỉ bắt được một đoạn âm thanh; phải đối chiếu cuộn băng rồi ổn định radio ở bước tiếp theo."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_restore_radio_components"
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_signal_partial",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_damaged",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_restore_radio_signal_partial",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_listen_static",
            "property": "display",
            "value": "show"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Radio chỉ bắt được một đoạn âm thanh. Hãy đối chiếu tín hiệu bằng cuộn băng, rồi ổn định mạch để xác minh giọng nói."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_restore_radio_components"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Radio vẫn thiếu vật liệu để sửa."
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
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_crystal"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "insulated_wire"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "spare_fuse"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "op": "<",
            "value": 4
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_crystal",
            "op": "<",
            "value": 3
          }
        ]
      }
    },
    "action_repair_radio_toolkit": {
      "meta": {
        "title": "Ổn định mạch radio",
        "buttonLabel": "Sửa radio",
        "desc": "Sau khi đối chiếu tín hiệu với cuộn băng, dùng bộ dụng cụ và dây cách điện để ổn định mạch radio. Đây là bước cuối của tuyến sửa tạm; khi hoàn tất, kết quả hội tụ với tuyến sửa hoàn chỉnh."
      },
      "set": {
        "display": "hide",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "usage",
            "target": "radio_toolkit",
            "value": -1
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "insulated_wire",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_damaged",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_radio_toolkit",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mạch radio đã ổn định. Đoạn băng và tín hiệu khớp nhau; giọng nói cùng danh tính được xác minh sơ bộ. Tuyến sửa tạm đã hội tụ với tuyến sửa hoàn chỉnh."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_signal_partial",
            "value": false
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "radio_damaged",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "insulated_wire"
          },
          {
            "type": "state",
            "property": "radio_static_matched",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "radio_signal_partial",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_listen_static": {
      "meta": {
        "title": "Nghe tín hiệu nhiễu",
        "buttonLabel": "Nghe tín hiệu",
        "desc": "Dùng cuộn băng ghi âm để đối chiếu đoạn tín hiệu yếu. Khi khớp được nhịp và giọng nói, bạn mới có thể sửa ổn định mạch radio."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_listen_static"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "voice_revealed",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_listen_static",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Đoạn tín hiệu trên radio khớp với cuộn băng. Giọng nói đã được nhận diện sơ bộ; cần ổn định mạch trước khi xác minh hoàn tất."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_static_matched",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_repair_radio_toolkit",
            "property": "display",
            "value": "show"
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_listen_static"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "radio_signal_partial",
            "op": "==",
            "value": true
          },
          {
            "ref": "tape_available"
          },
          {
            "type": "state",
            "property": "radio_damaged",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_rest_at_inn": {
      "meta": {
        "title": "Lấy lại bình tĩnh",
        "buttonLabel": "Nghỉ một lát",
        "desc": "An nghỉ một lát, chờ cho cảm giác bất an dịu xuống."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_rest_at_inn",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "An dần bình tĩnh lại."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "player_panicked",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_ground_with_radio": {
      "meta": {
        "title": "Lấy lại bình tĩnh theo nhịp phát thanh",
        "buttonLabel": "Nghe nhịp phát thanh",
        "desc": "Dựa vào nhịp phát thanh ổn định để lấy lại bình tĩnh; không cần tín hiệu phải hoàn hảo."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_ground_with_radio",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Nhịp radio giúp An lấy lại bình tĩnh."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "player_panicked",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_crystal"
          }
        ]
      }
    },
    "action_recover_with_mai": {
      "meta": {
        "title": "Cuộc trò chuyện với Mai",
        "buttonLabel": "Nói chuyện với Mai",
        "desc": "Mai nhận ra bạn đang không ổn. Cô ngồi lại bên cạnh, không hỏi về những chuyện bạn chưa muốn kể, chỉ kiên nhẫn chờ đến khi bạn có thể bình tĩnh lại. Sự hiện diện của cô khiến những âm thanh hỗn loạn trong đầu An dần lắng xuống."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "mai",
            "property": "trust",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "mai",
            "property": "fear",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_with_mai",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Mai giúp An. Giữa họ, lòng tin và nỗi sợ đã thay đổi."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "player_panicked",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_recover_with_linh": {
      "meta": {
        "title": "Nói chuyện riêng với Linh",
        "buttonLabel": "Nói chuyện riêng",
        "desc": "Tôn trọng sự riêng tư và tạo môi trường an toàn để Linh có thể nói chuyện."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "composure",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "linh",
            "property": "trust",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "linh",
            "property": "fear",
            "field": "current",
            "mode": "add",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "player_panicked",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_with_linh",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn và Linh đã cùng khôi phục một ký ức."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "player_panicked",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_reconstruct_manifest": {
      "meta": {
        "title": "Danh sách vận chuyển",
        "buttonLabel": "Tái dựng",
        "desc": "Dùng tên trên tường, cuộn phim hoặc hồ sơ lưu trữ để khôi phục danh sách vận chuyển bị thiếu."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_manifest"
          },
          {
            "type": "item",
            "subtype": "usage",
            "target": "tunnel_manifest",
            "value": -1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "manifest_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reconstruct_manifest",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bản kê hành khách đã được dựng lại."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_manifest"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "manifest_partial",
            "op": "==",
            "value": true
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
    "action_verify_evacuation_film": {
      "meta": {
        "title": "Xác minh cuộn phim sơ tán",
        "buttonLabel": "Đối chiếu cuộn phim",
        "desc": "Đối chiếu cuộn phim với danh sách vận chuyển hoặc sổ điểm danh."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_verify_evacuation_film"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_evacuation_film",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_evacuation_film",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Khung hình trên phim khớp với danh sách vận chuyển. Hai dấu vết độc lập cùng chỉ về chuyến đi ấy."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "corroboration_transport_records",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_verify_evacuation_film"
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
            "value": "evacuation_film"
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          }
        ]
      }
    },
    "action_recover_hymn": {
      "meta": {
        "title": "Phục hồi thánh ca",
        "buttonLabel": "Phục hồi",
        "desc": "Dùng lời khai của người giữ nhà nguyện hoặc sổ khách để khôi phục manh mối về bài thánh ca."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_recover_hymn"
          },
          {
            "type": "effect",
            "ref": "recover_hymn"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_recover_hymn",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dấu vết trong thánh ca đã được khôi phục từ bằng chứng."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_recover_hymn"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": false
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "guestbook"
          }
        ]
      }
    },
    "action_reconstruct_stakes_evidence": {
      "meta": {
        "title": "Tái dựng bằng chứng vòng cọc",
        "buttonLabel": "Tái dựng",
        "desc": "Dùng ảnh lớp và tên trên tường để xác nhận những dấu vết quanh vòng cọc."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_stakes_evidence"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_stakes",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "evidence_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reconstruct_stakes_evidence",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Ảnh lớp và những cái tên còn sót lại xác nhận dấu vết quanh vòng cọc."
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "corroboration_class_photo",
            "value": true
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_reconstruct_stakes_evidence"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "class_photo"
          },
          {
            "type": "state",
            "property": "knows_twelve",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_verify_tunnel_clue": {
      "meta": {
        "title": "Dấu đường hầm",
        "buttonLabel": "Xác minh",
        "desc": "Dùng danh sách vận chuyển, hồ sơ lưu trữ hoặc tên trên tường để xác nhận manh mối đường hầm."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_verify_tunnel_clue"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_tunnel_partial",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_tunnel_clue",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dấu đường hầm đã được xác nhận."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_verify_tunnel_clue"
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_tunnel_partial",
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
      }
    },
    "action_ending_release_partial": {
      "meta": {
        "title": "Giải thoát khi bằng chứng còn thiếu",
        "buttonLabel": "Giải thoát",
        "desc": "Nếu chuông đã vang, kho hồ sơ đã mở và bạn tìm được ít nhất một dấu vết nhưng chưa khôi phục đủ con dấu, thánh ca, vòng cọc và đường hầm, bạn có thể giải thoát những người còn mắc kẹt — dù sự thật vẫn thiếu những mảnh quan trọng."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_release_partial"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Bạn cần mở kho hồ sơ, làm chuông vang và tìm ít nhất một dấu vết. Nếu đã có con dấu, thánh ca, vòng cọc và đường hầm, con đường giải thoát hoàn chỉnh sẽ hiện ra."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
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
            "type": "state",
            "property": "bell_rung_imperfectly",
            "op": "==",
            "value": true
          },
          {
            "logic": "OR",
            "check": [
              {
                "type": "state",
                "property": "evidence_evacuation_seal",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_hymn",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_stakes",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "clue_tunnel",
                "op": "==",
                "value": true
              }
            ]
          },
          {
            "logic": "NOT",
            "check": [
              {
                "logic": "AND",
                "check": [
                  {
                    "type": "state",
                    "property": "evidence_evacuation_seal",
                    "op": "==",
                    "value": true
                  },
                  {
                    "type": "state",
                    "property": "clue_hymn",
                    "op": "==",
                    "value": true
                  },
                  {
                    "type": "state",
                    "property": "clue_stakes",
                    "op": "==",
                    "value": true
                  },
                  {
                    "type": "state",
                    "property": "clue_tunnel",
                    "op": "==",
                    "value": true
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    "action_ending_release_reconstructed": {
      "meta": {
        "title": "Giải thoát sau khi tái dựng sự thật",
        "buttonLabel": "Giải thoát",
        "desc": "Bạn đã chuẩn bị những điều cần thiết để giải thoát, đối chiếu ít nhất hai nhóm bằng chứng độc lập và khôi phục phần ký ức còn thiếu."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "end",
            "target": "ending_release_reconstructed"
          }
        ],
        "fail": [
          {
            "type": "notify",
            "subtype": "toast",
            "level": "warning",
            "text": "Hãy hoàn tất các dấu mốc giải thoát, khôi phục ký ức và đối chiếu ít nhất hai nhóm bằng chứng độc lập."
          }
        ]
      },
      "requirement": {
        "logic": "AND",
        "check": [
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
            "type": "state",
            "property": "evidence_evacuation_seal",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "evidence_verified",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "memory_reconstructed",
            "op": "==",
            "value": true
          },
          {
            "logic": "AND",
            "check": [
              {
                "type": "state",
                "property": "corroboration_transport_records",
                "op": "==",
                "value": true
              },
              {
                "type": "state",
                "property": "corroboration_class_photo",
                "op": "==",
                "value": true
              }
            ]
          }
        ]
      }
    },
    "action_verify_ticket": {
      "meta": {
        "title": "Xác minh vé tàu",
        "buttonLabel": "Xác minh vé",
        "desc": "Đối chiếu vé với danh sách hành khách hoặc hồ sơ lưu trữ khi dấu trên vé đã mờ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "effect",
            "ref": "consume_action_verify_ticket"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "ticket_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_verify_ticket",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bản kê hành khách xác nhận chiếc vé."
          }
        ],
        "fail": [
          {
            "type": "effect",
            "ref": "consume_action_verify_ticket"
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
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          }
        ]
      }
    },
    "action_reach_station_memory_evidence": {
      "meta": {
        "title": "Đến ga bằng cách tái dựng bằng chứng",
        "buttonLabel": "Tái dựng tuyến đường",
        "desc": "Từ những mảnh phim, hồ sơ và dấu tích đã đối chiếu, bạn có thể dựng lại tuyến đường đến ga 03:17 dù ký ức vẫn còn mờ."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "goto",
            "subtype": "scene",
            "target": "scene_ghost_station"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Những khung phim, hồ sơ và lời kể ghép lại thành con đường dẫn tới ga 03:17."
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "archive_open",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "evidence_evacuation_film",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_hymn",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_stakes",
            "op": "==",
            "value": true
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_reward_memory_roster": {
      "meta": {
        "title": "Đối chiếu danh sách lớp",
        "buttonLabel": "Đối chiếu danh sách lớp",
        "desc": "Một dấu vết mới được hé lộ khi danh sách lớp được đối chiếu với ảnh lớp."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "memory",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "clue_roster_verified",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reward_memory_roster",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "clue_roster_verified",
            "op": "==",
            "value": false
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "class_photo"
          },
          {
            "type": "state",
            "property": "clue_roster",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_reward_memory_tunnel": {
      "meta": {
        "title": "Đối chiếu tên trên tường",
        "buttonLabel": "Đối chiếu tên",
        "desc": "Một dấu vết mới được hé lộ khi tên trên tường được đối chiếu với danh sách vận chuyển."
      },
      "set": {
        "display": "show",
        "requirement": true,
        "readDesc": true
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "characters",
            "subtype": "edit_stats",
            "target": "player",
            "property": "memory",
            "field": "current",
            "mode": "add",
            "value": 1
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "memory_reward_tunnel",
            "value": true
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_reward_memory_tunnel",
            "property": "display",
            "value": "hide"
          }
        ],
        "fail": []
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "state",
            "property": "memory_reward_tunnel",
            "op": "==",
            "value": false
          },
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "tunnel_manifest"
          },
          {
            "type": "state",
            "property": "clue_tunnel",
            "op": "==",
            "value": true
          }
        ]
      }
    },
    "action_find_classroom_supplies": {
      "meta": {
        "title": "Dụng cụ và giấy can",
        "buttonLabel": "Tìm vật dụng",
        "desc": "Trong tủ có bộ dụng cụ sửa radio và giấy can để đối chiếu sơ đồ. Kính phóng đại được cất riêng và cần thu hồi bằng thao tác khác."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "radio_toolkit"
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "tracing_paper"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_classroom_supplies",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Bạn tìm thấy bộ dụng cụ sửa chữa, giấy can và kính phóng đại."
          }
        ]
      }
    },
    "action_find_cellar_components": {
      "meta": {
        "title": "Linh kiện trong hầm",
        "buttonLabel": "Thu hồi vật tư",
        "desc": "Trong các thùng và ngăn bảo trì có cuộn dây cách nhiệt cùng cầu chì sứ dự phòng. Cả hai đều có thể dùng để sửa radio bị hỏng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "insulated_wire"
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "spare_fuse"
          },
          {
            "type": "set",
            "subtype": "state",
            "target": "radio_damaged",
            "value": false
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_cellar_components",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Dây cách nhiệt và cầu chì dự phòng đã được tìm thấy."
          }
        ]
      }
    },
    "action_find_mill_components": {
      "meta": {
        "title": "Hộp bảo trì cối xay",
        "buttonLabel": "Mở hộp và thu hồi linh kiện",
        "desc": "Với bộ dụng cụ sửa chữa, bạn mở hộp bảo trì và thu hồi lò xo cơ khí cùng chốt bánh răng. Chốt bị cong, giải thích vì sao cối xay dừng hoạt động."
      },
      "set": {
        "display": "show",
        "requirement": true
      },
      "requirement": {
        "logic": "AND",
        "check": [
          {
            "type": "item",
            "subtype": "inventory",
            "op": "has",
            "value": "radio_toolkit"
          }
        ]
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "clockwork_spring"
          },
          {
            "type": "item",
            "subtype": "add",
            "target": "mill_gear_pin"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_mill_components",
            "property": "display",
            "value": "hide"
          },
          {
            "type": "goto",
            "subtype": "router",
            "target": "router_watermill_gear_inspected"
          },
          {
            "type": "notify",
            "subtype": "toast",
            "level": "success",
            "text": "Lò xo và chốt bánh răng đã tìm thấy. Lỗi truyền động được xác nhận."
          }
        ]
      }
    },
    "action_find_inspection_loupe": {
      "meta": {
        "title": "Kính phóng đại",
        "buttonLabel": "Lấy kính lúp",
        "desc": "Kính phóng đại nhỏ trong hộp bảo quản dụng cụ giúp đọc dấu khắc và nét sửa trên vật chứng."
      },
      "set": {
        "display": "show"
      },
      "effect": {
        "normal": [],
        "pass": [
          {
            "type": "item",
            "subtype": "add",
            "target": "inspection_loupe"
          },
          {
            "type": "set",
            "subtype": "action",
            "target": "action_find_inspection_loupe",
            "property": "display",
            "value": "hide"
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
              "text": "Nếu loa gọi đúng tên cậu, đừng trả lời. Dù giọng nói ấy nghe quen đến đâu."
            },
            {
              "char_id": "mai",
              "text": "Đêm sơ tán, mười hai người biến mất. Nhưng sáng hôm sau, cả làng chỉ nhớ đến mười một người. Tôi không biết ai đã bị bỏ lại trong ký ức."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "person": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi đã thấy người thứ mười hai đi xuống giếng. Tôi cứ nghĩ mình nhìn thấy người ấy… cho đến khi nhận ra trong ký ức, người bước xuống là tôi."
            }
          ],
          "choice_id": "person_follow",
          "choiced": false
        },
        "well": {
          "line": [
            {
              "char_id": "mai",
              "text": "Đêm sơ tán, tôi nghe tiếng động dưới giếng. Sáng hôm sau, giếng cạn trơ đáy. Tôi kể lại, nhưng chẳng ai tin—họ bảo đêm đó không có chuyện gì xảy ra."
            }
          ],
          "choice_id": "well_follow",
          "choiced": false
        },
        "gentle": {
          "line": [
            {
              "char_id": "mai",
              "text": "Cảm ơn cậu. Người ta cứ hỏi mãi, đến lúc tôi nói ra điều gì đó chỉ để họ thôi hỏi. Rồi chính tôi cũng không biết mình còn tin lời ấy không."
            }
          ],
          "choice_id": "gentle_follow",
          "choiced": false
        },
        "person_meaning": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi nhớ mình đứng ở miệng giếng. Nhưng tôi không biết đó là ký ức của tôi, hay ký ức của người đã bị xóa."
            }
          ],
          "choiced": false
        },
        "person_still_here": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi vẫn ở đây, đúng không? Ít nhất mọi người đều nói vậy. Nhưng đôi khi tôi không nhớ nổi mình đã sống ở đây bao lâu."
            }
          ],
          "choiced": false
        },
        "well_seen": {
          "line": [
            {
              "char_id": "mai",
              "text": "Không. Tôi chỉ thấy mặt nước rung lên, rồi nghe ai đó gọi tên mình từ dưới đáy."
            }
          ],
          "choiced": false
        },
        "well_silent": {
          "line": [
            {
              "char_id": "mai",
              "text": "Vì sau đêm đó, mỗi lần tôi kể lại, người nghe lại nhớ một chuyện khác. Tôi sợ mình sẽ quên mất phần còn lại."
            }
          ],
          "choiced": false
        },
        "gentle_return": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu cậu quay lại, hãy mang theo thứ gì đó chứng minh rằng chuyện này đã thật sự xảy ra."
            }
          ],
          "choiced": false
        },
        "gentle_doubt": {
          "line": [
            {
              "char_id": "mai",
              "text": "Cậu không cần tin tôi. Chỉ cần đừng vội tin những gì cả làng cùng nhớ."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "mai_person",
            "text": "Cô nói mười hai người biến mất. Người thứ mười hai là ai?",
            "jump": "person",
            "effect": [
              {
                "type": "item",
                "subtype": "add",
                "target": "red_umbrella"
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Mai trao cho bạn chiếc ô đỏ. Trong cán ô, cái tên của người thứ mười hai được khắc kín."
              }
            ]
          },
          {
            "id": "mai_well",
            "text": "Cô nhắc đến cái giếng. Đêm đó cô đã nghe thấy gì?",
            "jump": "well"
          },
          {
            "id": "mai_gentle",
            "text": "Tôi không muốn ép cô kể điều cô chưa sẵn sàng.",
            "jump": "gentle",
            "effect": []
          }
        ],
        "person_follow": [
          {
            "id": "mai_person_meaning",
            "text": "Khi nói “đó là tôi”, cô muốn nói mình đã đi xuống giếng?",
            "jump": "person_meaning"
          },
          {
            "id": "mai_person_still",
            "text": "Nếu cô là người đó, tại sao cô vẫn ở đây?",
            "jump": "person_still_here"
          }
        ],
        "well_follow": [
          {
            "id": "mai_well_seen",
            "text": "Cô có nhìn thấy ai ở dưới đó không?",
            "jump": "well_seen"
          },
          {
            "id": "mai_well_silent",
            "text": "Tại sao cô chưa từng kể chuyện này với ai?",
            "jump": "well_silent"
          }
        ],
        "gentle_follow": [
          {
            "id": "mai_gentle_return",
            "text": "Tôi sẽ quay lại. Có lẽ lúc đó cô sẽ nhớ thêm.",
            "jump": "gentle_return"
          },
          {
            "id": "mai_gentle_doubt",
            "text": "Tôi chưa biết có thể tin cô đến đâu.",
            "jump": "gentle_doubt"
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
              "text": "Phòng của cậu đã được dọn sẵn."
            },
            {
              "char_id": "hanh",
              "text": "Tôi không nhớ ai đặt phòng. Chìa khóa vẫn nằm đúng chỗ—như thể cậu chỉ đi đâu đó một lúc rồi sẽ quay về."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "room": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi nhận được lời dặn phải giữ căn phòng ấy. Không có tên người gửi, chỉ có ngày tháng... là ngày hôm nay."
            }
          ],
          "choice_id": "room_follow",
          "choiced": false
        },
        "book": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Sổ khách không ghi người đến. Nó ghi người chưa rời đi. Tên cậu nằm ở trang cuối, nhưng nét mực còn mới."
            }
          ],
          "choice_id": "book_follow",
          "choiced": false
        },
        "expected": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi đã nghe tiếng bước chân ngoài hành lang trước khi cậu gõ cửa. Tôi không biết mình chờ cậu, hay chỉ sợ cậu sẽ đến."
            }
          ],
          "choice_id": "expected_follow",
          "choiced": false
        },
        "room_who": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Nếu tôi biết người đó là ai, cậu nghĩ tôi còn phải giữ bí mật đến tận bây giờ sao?"
            }
          ],
          "choiced": false
        },
        "room_date": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Ngày ghi trên giấy là hôm nay. Nhưng nét chữ cũ đến mức tôi không dám chắc tờ giấy được viết khi nào."
            }
          ],
          "choiced": false
        },
        "book_name": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi đã thấy tên ấy nhiều lần. Mỗi lần mở sổ, tôi lại nhớ một người khác nhau đã viết nó."
            }
          ],
          "choiced": false
        },
        "book_leave": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Có người từng trả chìa khóa, có người bỏ đi giữa đêm. Nhưng sổ vẫn giữ tên họ. Tôi không biết phải tin cuốn sổ hay trí nhớ của mình."
            }
          ],
          "choiced": false
        },
        "expected_wait": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi không biết. Chỉ nhớ rằng có một chiếc cốc đặt sẵn trên bàn, dù tôi sống một mình."
            }
          ],
          "choiced": false
        },
        "expected_room": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Căn phòng ở cuối hành lang. Nếu cậu vào đó, đừng tin ngay mọi thứ được sắp đặt sẵn."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "hanh_room",
            "text": "Ai đã chuẩn bị phòng cho tôi?",
            "jump": "room"
          },
          {
            "id": "hanh_book",
            "text": "Bà có thể cho tôi xem cuốn sổ khách không?",
            "jump": "book",
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
                "text": "Bà Hạnh xác nhận cuốn sổ ghi lại những người chưa thể rời khỏi làng."
              }
            ]
          },
          {
            "id": "hanh_expected",
            "text": "Bà vừa nói như thể đã biết tôi sẽ đến. Bà có chờ tôi không?",
            "jump": "expected"
          }
        ],
        "room_follow": [
          {
            "id": "hanh_room_who",
            "text": "Bà thật sự không biết ai đã gửi lời dặn sao?",
            "jump": "room_who"
          },
          {
            "id": "hanh_room_date",
            "text": "Ngày tháng trên lời dặn là ngày nào?",
            "jump": "room_date"
          }
        ],
        "book_follow": [
          {
            "id": "hanh_book_name",
            "text": "Bà có biết ai đã viết tên tôi vào đây không?",
            "jump": "book_name"
          },
          {
            "id": "hanh_book_leave",
            "text": "Vậy những người có tên trong sổ có thể rời khỏi làng không?",
            "jump": "book_leave"
          }
        ],
        "expected_follow": [
          {
            "id": "hanh_expected_wait",
            "text": "Bà đã chờ tôi bao lâu rồi?",
            "jump": "expected_wait"
          },
          {
            "id": "hanh_expected_room",
            "text": "Tôi muốn tự mình xem căn phòng đó.",
            "jump": "expected_room"
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
              "text": "Chuông không gọi người chết. Nó gọi những người còn nhớ—ít nhất, đó là điều tôi vẫn tự nhắc mình."
            },
            {
              "char_id": "keeper",
              "text": "Đêm sơ tán, tôi nghe đủ ba hồi chuông. Sáng hôm sau, có người quả quyết đã nghe hồi thứ tư. Tôi không biết họ nghe thật, hay chỉ nhớ điều mình sợ."
            }
          ],
          "choice_id": "ask",
          "choiced": false
        },
        "stay": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi ở lại vì có người phải nhớ lời cầu nguyện cuối cùng. Tôi không chắc mình còn nhớ đúng lời."
            }
          ],
          "choice_id": "stay_follow",
          "choiced": false
        },
        "bells": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Ba hồi chuông gọi ký ức trở về. Hồi thứ tư không nằm trong nghi thức. Nó chỉ xuất hiện trong những lời kể mà không ai nhận là của mình."
            }
          ],
          "choice_id": "bells_follow",
          "choiced": false
        },
        "fourth": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi không biết hồi thứ tư sẽ làm gì. Có người nói nó xóa ngôi làng; có người nói nó chỉ xóa những người đã bị quên."
            }
          ],
          "choice_id": "fourth_follow",
          "choiced": false
        },
        "stay_name": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi từng biết tên người đọc lời cầu nguyện. Bây giờ tôi chỉ nhớ giọng nói. Có lẽ đó là điều đã xảy ra với tất cả chúng ta."
            }
          ],
          "choiced": false
        },
        "stay_belief": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi vẫn giữ nghi thức, nhưng không còn dám gọi đó là đức tin. Đôi khi người ta lặp lại một điều chỉ vì sợ điều gì sẽ xảy ra nếu dừng lại."
            }
          ],
          "choiced": false
        },
        "bells_source": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Bản thánh ca có ghi ba hồi. Phần nói về hồi thứ tư đã bị cạo khỏi trang giấy."
            }
          ],
          "choiced": false
        },
        "bells_test": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi không dám thử. Nếu ký ức là thứ giữ ngôi làng này lại, có thể một hồi chuông sai sẽ khiến chúng ta không còn đường quay về."
            }
          ],
          "choiced": false
        },
        "fourth_truth": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Tôi chỉ có lời kể, không có bằng chứng. Cậu đừng biến nỗi sợ của tôi thành sự thật chỉ vì nó khớp với điều cậu đang tìm."
            }
          ],
          "choiced": false
        },
        "fourth_stop": {
          "line": [
            {
              "char_id": "keeper",
              "text": "Có lẽ dừng ở đây là tốt nhất. Ngay cả những điều được gọi là sự thật cũng có thể làm tổn thương người còn sống."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "ask": [
          {
            "id": "keeper_stay",
            "text": "Vì sao ông vẫn ở lại nhà nguyện này?",
            "jump": "stay"
          },
          {
            "id": "keeper_bells",
            "text": "Ba hồi chuông có ý nghĩa gì?",
            "jump": "bells",
            "effect": [
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Người giữ nhà nguyện kể về ba hồi chuông—và điều ông sợ sẽ xảy ra nếu hồi thứ tư vang lên."
              }
            ]
          },
          {
            "id": "keeper_fourth",
            "text": "Ông vừa nhắc đến hồi thứ tư. Ông nghĩ điều gì sẽ xảy ra nếu nó vang lên?",
            "jump": "fourth"
          }
        ],
        "stay_follow": [
          {
            "id": "keeper_stay_name",
            "text": "Ông còn nhớ người đã đọc lời cầu nguyện đêm đó không?",
            "jump": "stay_name"
          },
          {
            "id": "keeper_stay_belief",
            "text": "Ông còn tin vào nghi thức này không?",
            "jump": "stay_belief"
          }
        ],
        "bells_follow": [
          {
            "id": "keeper_bells_source",
            "text": "Có tài liệu nào ghi lại nghi thức ấy không?",
            "jump": "bells_source"
          },
          {
            "id": "keeper_bells_test",
            "text": "Ông đã từng thử làm chuông ngân lại chưa?",
            "jump": "bells_test"
          }
        ],
        "fourth_follow": [
          {
            "id": "keeper_fourth_truth",
            "text": "Ông biết điều đó, hay chỉ đang sợ điều có thể xảy ra?",
            "jump": "fourth_truth"
          },
          {
            "id": "keeper_fourth_stop",
            "text": "Tôi hiểu rồi. Tôi sẽ không bắt ông phải nói thêm.",
            "jump": "fourth_stop"
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
            },
            {
              "char_id": "voice",
              "text": "Đừng hỏi tôi cậu đã bỏ lỡ điều gì. Hãy hỏi vì sao mọi người vẫn nhớ cậu theo những cách khác nhau."
            }
          ],
          "choice_id": "reply",
          "choiced": false
        },
        "late": {
          "line": [
            {
              "char_id": "voice",
              "text": "Chuyến tàu rời ga vào đêm sơ tán. Cậu xuất hiện trong bản ghi sau ngày nó rời đi, nhưng vé của cậu lại được đóng dấu trước đó."
            }
          ],
          "choice_id": "late_follow",
          "choiced": false
        },
        "identity": {
          "line": [
            {
              "char_id": "voice",
              "text": "Tôi là phần còn lại của một thông báo chưa được phát hết. Nếu cậu cần một cái tên, tôi không có cái tên nào đáng tin."
            }
          ],
          "choice_id": "identity_follow",
          "choiced": false
        },
        "village": {
          "line": [
            {
              "char_id": "voice",
              "text": "Có thể ngôi làng là ký ức tập thể của những người không chấp nhận cuộc sơ tán. Nhưng ký ức tập thể cũng biết nói dối."
            }
          ],
          "choice_id": "village_follow",
          "choiced": false
        },
        "late_record": {
          "line": [
            {
              "char_id": "voice",
              "text": "Bản ghi có hai mốc giờ. Một mốc nói cậu đến muộn mười bảy năm; mốc kia nói cậu đã lên tàu trước khi cuộc sơ tán bắt đầu."
            }
          ],
          "choiced": false
        },
        "late_person": {
          "line": [
            {
              "char_id": "voice",
              "text": "Tôi không biết cậu là ai trong đêm ấy. Chỉ có một chỗ trống trong danh sách—và mỗi người lại gọi chỗ trống đó bằng một cái tên khác."
            }
          ],
          "choiced": false
        },
        "identity_source": {
          "line": [
            {
              "char_id": "voice",
              "text": "Giọng nói này xuất hiện trên băng ghi âm ở ga. Nhưng đoạn băng bắt đầu giữa câu, như thể ai đó đã cắt bỏ phần giới thiệu."
            }
          ],
          "choiced": false
        },
        "identity_trust": {
          "line": [
            {
              "char_id": "voice",
              "text": "Đừng tin tôi chỉ vì tôi biết những điều cậu chưa biết. Tôi chỉ là một đoạn ghi âm, bị mắc kẹt giữa những lần phát lại."
            }
          ],
          "choiced": false
        },
        "village_proof": {
          "line": [
            {
              "char_id": "voice",
              "text": "Hãy tìm bản kê hành khách và cuộn phim sơ tán. Nếu chúng mâu thuẫn với tôi, hãy tin vật chứng trước khi tin giọng nói."
            }
          ],
          "choiced": false
        },
        "village_question": {
          "line": [
            {
              "char_id": "voice",
              "text": "Đó là điều cậu phải tự quyết định. Tôi có thể chỉ ra những mâu thuẫn, nhưng không thể chọn ký ức nào là của cậu."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "reply": [
          {
            "id": "voice_late",
            "text": "Tại sao lại là mười bảy năm? Tôi đã bỏ lỡ chuyện gì?",
            "jump": "late"
          },
          {
            "id": "voice_identity",
            "text": "Anh là ai? Tại sao lại biết tôi?",
            "jump": "identity"
          },
          {
            "id": "voice_village",
            "text": "Anh nói ngôi làng là ký ức. Dựa vào đâu tôi phải tin điều đó?",
            "jump": "village",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "voice_revealed",
                "value": true
              },
              {
                "type": "notify",
                "subtype": "toast",
                "level": "success",
                "text": "Tín hiệu đưa ra một giả thuyết về ngôi làng. Nhưng vẫn còn những điều chưa được chứng minh."
              }
            ]
          }
        ],
        "late_follow": [
          {
            "id": "voice_late_record",
            "text": "Bản ghi nào có hai mốc giờ đó?",
            "jump": "late_record"
          },
          {
            "id": "voice_late_person",
            "text": "Anh có biết ai đang bị thiếu khỏi danh sách không?",
            "jump": "late_person"
          }
        ],
        "identity_follow": [
          {
            "id": "voice_identity_source",
            "text": "Giọng nói này được ghi lại ở đâu?",
            "jump": "identity_source"
          },
          {
            "id": "voice_identity_trust",
            "text": "Nếu chính anh cũng không đáng tin, tại sao tôi phải nghe tiếp?",
            "jump": "identity_trust"
          }
        ],
        "village_follow": [
          {
            "id": "voice_village_proof",
            "text": "Vậy tôi cần tìm vật chứng nào để kiểm tra lời anh?",
            "jump": "village_proof"
          },
          {
            "id": "voice_village_question",
            "text": "Nếu ký ức có thể nói dối, làm sao tôi biết đâu là sự thật?",
            "jump": "village_question"
          }
        ]
      }
    },
    "chat_mai_well": {
      "meta": {
        "title": "Mai — Dấu vết dưới giếng",
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
              "text": "Cậu đã nhìn thấy phù hiệu dưới đáy giếng rồi phải không?"
            },
            {
              "char_id": "mai",
              "text": "Tôi cứ nghĩ nếu không ai tìm thấy nó, chuyện đêm ấy sẽ tiếp tục nằm yên."
            }
          ],
          "choice_id": "well_ask",
          "choiced": false
        },
        "badge": {
          "line": [
            {
              "char_id": "mai",
              "text": "Phù hiệu ấy thuộc đội sơ tán. Tôi nhận ra vết khắc, nhưng không nhớ ai đã đeo nó. Có những ký ức chỉ trở lại dưới dạng một vật vô tri."
            }
          ],
          "choice_id": "well_badge_follow",
          "choiced": false
        },
        "self": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi từng đứng sát miệng giếng. Có người nắm cổ tay tôi, nhưng khi quay lại, tôi chỉ thấy chiếc ô đỏ nằm trên đất."
            }
          ],
          "choice_id": "well_self_follow",
          "choiced": false
        },
        "silence": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi im lặng vì mỗi lần kể, một chi tiết lại biến mất. Lần gần nhất, tôi không còn nhớ khuôn mặt người đã gọi tên mình."
            }
          ],
          "choice_id": "well_silence_follow",
          "choiced": false
        },
        "badge_mark": {
          "line": [
            {
              "char_id": "mai",
              "text": "Vết khắc trên phù hiệu trùng với dấu ở bờ đê. Nó chứng minh người mang phù hiệu đã tham gia cuộc sơ tán, không chứng minh người đó là ai."
            }
          ],
          "choiced": false
        },
        "badge_memory": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi nhớ tiếng kim loại va vào thành giếng. Sau đó là ba hồi chuông, rồi một khoảng lặng dài đến mức tôi tưởng cả làng đã ngừng thở."
            }
          ],
          "choiced": false
        },
        "self_wrist": {
          "line": [
            {
              "char_id": "mai",
              "text": "Trên cổ tay tôi từng có một vệt hằn hình dây buộc. Tôi không biết đó là dấu bị kéo đi hay chỉ là vết thương từ trước."
            }
          ],
          "choiced": false
        },
        "self_doubt": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu ký ức ấy thuộc về người khác, có lẽ tôi đã mang nó suốt mười bảy năm mà không nhận ra."
            }
          ],
          "choiced": false
        },
        "silence_reason": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi sợ nếu kể hết, mọi người sẽ nhớ lại cùng một lúc. Tôi không biết điều gì sẽ xảy ra khi cả làng cùng nhớ."
            }
          ],
          "choiced": false
        },
        "silence_help": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu muốn giúp, hãy đối chiếu phù hiệu với danh sách vận chuyển. Đừng dùng lời tôi làm bằng chứng duy nhất."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "well_ask": [
          {
            "id": "mai_well_badge",
            "text": "Tôi tìm thấy phù hiệu dưới giếng. Cô nhận ra nó chứ?",
            "jump": "badge"
          },
          {
            "id": "mai_well_self",
            "text": "Cô nói từng đứng bên giếng. Chuyện gì đã xảy ra với cô?",
            "jump": "self"
          },
          {
            "id": "mai_well_silence",
            "text": "Vì sao cô không kể chuyện này từ trước?",
            "jump": "silence"
          }
        ],
        "well_badge_follow": [
          {
            "id": "mai_badge_mark",
            "text": "Vết khắc trên phù hiệu có ý nghĩa gì?",
            "jump": "badge_mark"
          },
          {
            "id": "mai_badge_memory",
            "text": "Cô nhớ điều gì xảy ra ngay sau đó?",
            "jump": "badge_memory"
          }
        ],
        "well_self_follow": [
          {
            "id": "mai_self_wrist",
            "text": "Vết hằn trên cổ tay cô có liên quan đến người kéo cô đi không?",
            "jump": "self_wrist"
          },
          {
            "id": "mai_self_doubt",
            "text": "Cô có chắc ký ức ấy là của mình?",
            "jump": "self_doubt"
          }
        ],
        "well_silence_follow": [
          {
            "id": "mai_silence_reason",
            "text": "Cô sợ điều gì sẽ xảy ra nếu mọi người nhớ lại?",
            "jump": "silence_reason"
          },
          {
            "id": "mai_silence_help",
            "text": "Tôi có thể kiểm chứng lời cô bằng cách nào?",
            "jump": "silence_help"
          }
        ]
      }
    },
    "chat_mai_memory": {
      "meta": {
        "title": "Mai — Bảo vệ ký ức",
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
              "text": "Cậu đã chọn bảo vệ Linh. Tôi không biết đó là cách đúng, nhưng tôi hiểu vì sao cậu không muốn biến ký ức của em ấy thành hồ sơ."
            },
            {
              "char_id": "mai",
              "text": "Có những điều tôi chỉ dám kể khi biết chúng sẽ không bị dùng để buộc người khác phải chứng minh mình tồn tại."
            }
          ],
          "choice_id": "umbrella_ask",
          "choiced": false
        },
        "name": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nét khắc bị cào lại nhiều lần. Tôi nhận ra chữ đầu tiên, nhưng phần còn lại giống tên của một người mà cả làng đều bảo chưa từng tồn tại."
            }
          ],
          "choice_id": "name_follow",
          "choiced": false
        },
        "owner": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chiếc ô từng ở quầy hàng của tôi. Nhưng có những ngày tôi nhớ mình đã đưa nó cho một đứa trẻ, có ngày lại nhớ chính mình cầm nó đi xuống giếng."
            }
          ],
          "choice_id": "owner_follow",
          "choiced": false
        },
        "accuse": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu cậu muốn hỏi tôi có phải người thứ mười hai không, câu trả lời là tôi không biết. Tôi chỉ biết ký ức của mình có một khoảng trống mang hình dáng của người đó."
            }
          ],
          "choice_id": "accuse_follow",
          "choiced": false
        },
        "first_letter": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chữ đầu tiên có thể là L. Nhưng trên những bản ghi cũ, tên ấy bị sửa thành một vết mực đen."
            }
          ],
          "choiced": false
        },
        "other_names": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi từng nghe ba cách đọc khác nhau cho cùng một cái tên. Mỗi người đều tin cách của mình là đúng."
            }
          ],
          "choiced": false
        },
        "child": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi nhớ bàn tay nhỏ nắm cán ô. Không nhớ mặt, không nhớ giọng. Chỉ nhớ đứa trẻ hỏi liệu chuyến tàu có chờ đủ mười hai người không."
            }
          ],
          "choiced": false
        },
        "memory": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu ký ức ấy là của tôi, tôi đã quên một người. Nếu là của người khác, tôi đang nhớ thay họ."
            }
          ],
          "choiced": false
        },
        "doubt": {
          "line": [
            {
              "char_id": "mai",
              "text": "Cậu nên hỏi Linh về bức ảnh lớp. Một cái tên có thể bị sửa, nhưng vị trí của một người trong bức ảnh khó biến mất hoàn toàn."
            }
          ],
          "choiced": false
        },
        "leave": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi không thể đưa cậu câu trả lời chắc chắn. Hãy giữ chiếc ô và đối chiếu nó với hồ sơ."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "umbrella_ask": [
          {
            "id": "mai_umbrella_name",
            "text": "Nếu tôi nhớ đúng, cái tên trên cán ô có thể gợi lại điều cô từng quên. Cô nhận ra nó chứ?",
            "jump": "name"
          },
          {
            "id": "mai_umbrella_owner",
            "text": "Cô còn nhớ chiếc ô này từng ở bên ai không?",
            "jump": "owner"
          },
          {
            "id": "mai_umbrella_accuse",
            "text": "Có khi nào ký ức về người thứ mười hai đang lẫn với ký ức của cô?",
            "jump": "accuse"
          }
        ],
        "name_follow": [
          {
            "id": "mai_name_letter",
            "text": "Cô đọc được chữ nào đầu tiên?",
            "jump": "first_letter"
          },
          {
            "id": "mai_name_versions",
            "text": "Vì sao mỗi người lại đọc cái tên ấy khác nhau?",
            "jump": "other_names"
          }
        ],
        "owner_follow": [
          {
            "id": "mai_owner_child",
            "text": "Cô có nhớ đứa trẻ đã cầm chiếc ô không?",
            "jump": "child"
          },
          {
            "id": "mai_owner_memory",
            "text": "Cô nghĩ ký ức đó thuộc về ai?",
            "jump": "memory"
          }
        ],
        "accuse_follow": [
          {
            "id": "mai_accuse_doubt",
            "text": "Cô có nghĩ mình đang nhớ thay một người khác?",
            "jump": "doubt"
          },
          {
            "id": "mai_accuse_leave",
            "text": "Tôi sẽ đối chiếu chiếc ô với hồ sơ trước.",
            "jump": "leave"
          }
        ]
      }
    },
    "chat_mai_evidence": {
      "meta": {
        "title": "Mai — Hồ sơ được giữ lại",
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
              "text": "Cậu đã giữ bản ghi ở trường. Nếu hồ sơ còn nguyên, tôi có thể giúp đối chiếu những cái tên mà làng đã sửa."
            },
            {
              "char_id": "mai",
              "text": "Nhưng đừng để giấy tờ thay thế lời người sống. Bản ghi có thể xác nhận một sự kiện, không thể nói hết một người."
            }
          ],
          "choice_id": "umbrella_ask",
          "choiced": false
        },
        "name": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nét khắc bị cào lại nhiều lần. Tôi nhận ra chữ đầu tiên, nhưng phần còn lại giống tên của một người mà cả làng đều bảo chưa từng tồn tại."
            }
          ],
          "choice_id": "name_follow",
          "choiced": false
        },
        "owner": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chiếc ô từng ở quầy hàng của tôi. Nhưng có những ngày tôi nhớ mình đã đưa nó cho một đứa trẻ, có ngày lại nhớ chính mình cầm nó đi xuống giếng."
            }
          ],
          "choice_id": "owner_follow",
          "choiced": false
        },
        "accuse": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu cậu muốn hỏi tôi có phải người thứ mười hai không, câu trả lời là tôi không biết. Tôi chỉ biết ký ức của mình có một khoảng trống mang hình dáng của người đó."
            }
          ],
          "choice_id": "accuse_follow",
          "choiced": false
        },
        "first_letter": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chữ đầu tiên có thể là L. Nhưng trên những bản ghi cũ, tên ấy bị sửa thành một vết mực đen."
            }
          ],
          "choiced": false
        },
        "other_names": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi từng nghe ba cách đọc khác nhau cho cùng một cái tên. Mỗi người đều tin cách của mình là đúng."
            }
          ],
          "choiced": false
        },
        "child": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi nhớ bàn tay nhỏ nắm cán ô. Không nhớ mặt, không nhớ giọng. Chỉ nhớ đứa trẻ hỏi liệu chuyến tàu có chờ đủ mười hai người không."
            }
          ],
          "choiced": false
        },
        "memory": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu ký ức ấy là của tôi, tôi đã quên một người. Nếu là của người khác, tôi đang nhớ thay họ."
            }
          ],
          "choiced": false
        },
        "doubt": {
          "line": [
            {
              "char_id": "mai",
              "text": "Cậu nên hỏi Linh về bức ảnh lớp. Một cái tên có thể bị sửa, nhưng vị trí của một người trong bức ảnh khó biến mất hoàn toàn."
            }
          ],
          "choiced": false
        },
        "leave": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi không thể đưa cậu câu trả lời chắc chắn. Hãy giữ chiếc ô và đối chiếu nó với hồ sơ."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "umbrella_ask": [
          {
            "id": "mai_umbrella_name",
            "text": "Tôi muốn đối chiếu tên khắc trên cán ô với hồ sơ. Cô nhận ra cái tên này chứ?",
            "jump": "name"
          },
          {
            "id": "mai_umbrella_owner",
            "text": "Hồ sơ có ghi chiếc ô thuộc về ai không, hay cô nhớ người từng sở hữu nó?",
            "jump": "owner"
          },
          {
            "id": "mai_umbrella_accuse",
            "text": "Có bằng chứng nào cho thấy cô là người thứ mười hai, hay chỉ là ký ức của cô?",
            "jump": "accuse"
          }
        ],
        "name_follow": [
          {
            "id": "mai_name_letter",
            "text": "Cô đọc được chữ nào đầu tiên?",
            "jump": "first_letter"
          },
          {
            "id": "mai_name_versions",
            "text": "Vì sao mỗi người lại đọc cái tên ấy khác nhau?",
            "jump": "other_names"
          }
        ],
        "owner_follow": [
          {
            "id": "mai_owner_child",
            "text": "Cô có nhớ đứa trẻ đã cầm chiếc ô không?",
            "jump": "child"
          },
          {
            "id": "mai_owner_memory",
            "text": "Cô nghĩ ký ức đó thuộc về ai?",
            "jump": "memory"
          }
        ],
        "accuse_follow": [
          {
            "id": "mai_accuse_doubt",
            "text": "Cô có nghĩ mình đang nhớ thay một người khác?",
            "jump": "doubt"
          },
          {
            "id": "mai_accuse_leave",
            "text": "Tôi sẽ đối chiếu chiếc ô với hồ sơ trước.",
            "jump": "leave"
          }
        ]
      }
    },
    "chat_mai_umbrella": {
      "meta": {
        "title": "Mai — Cái tên trên cán ô",
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
              "text": "Cậu đã đọc cái tên khắc bên trong cán ô đỏ chưa?"
            },
            {
              "char_id": "mai",
              "text": "Đừng vội cho rằng cái tên ấy giải thích được người thứ mười hai. Có thể nó chỉ cho biết ai đã cầm chiếc ô."
            }
          ],
          "choice_id": "umbrella_ask",
          "choiced": false
        },
        "name": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nét khắc bị cào lại nhiều lần. Tôi nhận ra chữ đầu tiên, nhưng phần còn lại giống tên của một người mà cả làng đều bảo chưa từng tồn tại."
            }
          ],
          "choice_id": "name_follow",
          "choiced": false
        },
        "owner": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chiếc ô từng ở quầy hàng của tôi. Nhưng có những ngày tôi nhớ mình đã đưa nó cho một đứa trẻ, có ngày lại nhớ chính mình cầm nó đi xuống giếng."
            }
          ],
          "choice_id": "owner_follow",
          "choiced": false
        },
        "accuse": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu cậu muốn hỏi tôi có phải người thứ mười hai không, câu trả lời là tôi không biết. Tôi chỉ biết ký ức của mình có một khoảng trống mang hình dáng của người đó."
            }
          ],
          "choice_id": "accuse_follow",
          "choiced": false
        },
        "first_letter": {
          "line": [
            {
              "char_id": "mai",
              "text": "Chữ đầu tiên có thể là L. Nhưng trên những bản ghi cũ, tên ấy bị sửa thành một vết mực đen."
            }
          ],
          "choiced": false
        },
        "other_names": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi từng nghe ba cách đọc khác nhau cho cùng một cái tên. Mỗi người đều tin cách của mình là đúng."
            }
          ],
          "choiced": false
        },
        "child": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi nhớ bàn tay nhỏ nắm cán ô. Không nhớ mặt, không nhớ giọng. Chỉ nhớ đứa trẻ hỏi liệu chuyến tàu có chờ đủ mười hai người không."
            }
          ],
          "choiced": false
        },
        "memory": {
          "line": [
            {
              "char_id": "mai",
              "text": "Nếu ký ức ấy là của tôi, tôi đã quên một người. Nếu là của người khác, tôi đang nhớ thay họ."
            }
          ],
          "choiced": false
        },
        "doubt": {
          "line": [
            {
              "char_id": "mai",
              "text": "Cậu nên hỏi Linh về bức ảnh lớp. Một cái tên có thể bị sửa, nhưng vị trí của một người trong bức ảnh khó biến mất hoàn toàn."
            }
          ],
          "choiced": false
        },
        "leave": {
          "line": [
            {
              "char_id": "mai",
              "text": "Tôi không thể đưa cậu câu trả lời chắc chắn. Hãy giữ chiếc ô và đối chiếu nó với hồ sơ."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "umbrella_ask": [
          {
            "id": "mai_umbrella_name",
            "text": "Cái tên khắc trong cán ô đỏ—cô có nhận ra không?",
            "jump": "name"
          },
          {
            "id": "mai_umbrella_owner",
            "text": "Cô nhớ ai đã cầm chiếc ô này trước đêm sơ tán không?",
            "jump": "owner"
          },
          {
            "id": "mai_umbrella_accuse",
            "text": "Cô nghĩ chiếc ô này có liên quan đến người thứ mười hai không?",
            "jump": "accuse"
          }
        ],
        "name_follow": [
          {
            "id": "mai_name_letter",
            "text": "Cô đọc được chữ nào đầu tiên?",
            "jump": "first_letter"
          },
          {
            "id": "mai_name_versions",
            "text": "Vì sao mỗi người lại đọc cái tên ấy khác nhau?",
            "jump": "other_names"
          }
        ],
        "owner_follow": [
          {
            "id": "mai_owner_child",
            "text": "Cô có nhớ đứa trẻ đã cầm chiếc ô không?",
            "jump": "child"
          },
          {
            "id": "mai_owner_memory",
            "text": "Cô nghĩ ký ức đó thuộc về ai?",
            "jump": "memory"
          }
        ],
        "accuse_follow": [
          {
            "id": "mai_accuse_doubt",
            "text": "Cô có nghĩ mình đang nhớ thay một người khác?",
            "jump": "doubt"
          },
          {
            "id": "mai_accuse_leave",
            "text": "Tôi sẽ đối chiếu chiếc ô với hồ sơ trước.",
            "jump": "leave"
          }
        ]
      }
    },
    "chat_hanh_guestbook": {
      "meta": {
        "title": "Bà Hạnh — Những dòng cuối sổ khách",
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
              "text": "Cậu đã xem trang cuối rồi. Tôi biết cậu sẽ quay lại hỏi về nó."
            },
            {
              "char_id": "hanh",
              "text": "Có những cái tên được viết vào sổ sau khi người mang tên ấy đã rời khỏi làng. Cũng có tên không bao giờ được gạch đi."
            }
          ],
          "choice_id": "guestbook_ask",
          "choiced": false
        },
        "writer": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi không nhận ra nét chữ. Nhưng mực và giấy đều thuộc loại nhà trọ chỉ dùng từ mười bảy năm trước. Ai đó đã viết tên cậu bằng một cây bút không còn được sản xuất."
            }
          ],
          "choice_id": "writer_follow",
          "choiced": false
        },
        "departure": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi từng gạch tên khách khi họ trả chìa khóa. Riêng một số dòng, sáng hôm sau lại hiện ra nguyên vẹn, dù tôi nhớ rõ mình đã xóa."
            }
          ],
          "choice_id": "departure_follow",
          "choiced": false
        },
        "duplicate": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Có hai trang ghi cùng một ngày đến, cùng một căn phòng, nhưng tên người thuê khác nhau. Một trang mang tên cậu."
            }
          ],
          "choice_id": "duplicate_follow",
          "choiced": false
        },
        "ink": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Mực không mới. Nó chỉ chưa khô trong ký ức của tôi. Nếu nhìn bằng mắt, trang giấy đã cũ; nếu nhớ lại, tôi vừa mới viết nó."
            }
          ],
          "choiced": false
        },
        "room": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Căn phòng ấy được ghi là phòng số bảy. Nhưng sơ đồ nhà trọ chỉ có sáu phòng, và tôi không còn giữ bản vẽ cũ."
            }
          ],
          "choiced": false
        },
        "key": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Chìa khóa dự phòng từng treo sau quầy. Tôi không nhớ ai lấy nó, chỉ biết ổ khóa ở cuối hành lang vẫn còn dấu mới."
            }
          ],
          "choiced": false
        },
        "erase": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi đã thử xé trang giấy. Sáng hôm sau, cuốn sổ trở lại nguyên vẹn, chỉ có ngón tay tôi dính mực đen."
            }
          ],
          "choiced": false
        },
        "proof": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Hãy tìm căn phòng bị thiếu. Nếu trong đó còn vật gì, nó có thể cho biết ai đã viết tên cậu và vì sao."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "guestbook_ask": [
          {
            "id": "hanh_guestbook_writer",
            "text": "Ai đã viết tên tôi vào trang cuối?",
            "jump": "writer"
          },
          {
            "id": "hanh_guestbook_departure",
            "text": "Vì sao tên những người đã rời đi vẫn còn trong sổ?",
            "jump": "departure"
          },
          {
            "id": "hanh_guestbook_duplicate",
            "text": "Có phải sổ khách ghi nhiều phiên bản của cùng một người?",
            "jump": "duplicate"
          }
        ],
        "writer_follow": [
          {
            "id": "hanh_writer_ink",
            "text": "Mực trên trang ấy có thật sự mới không?",
            "jump": "ink"
          },
          {
            "id": "hanh_writer_room",
            "text": "Tên tôi được ghi cạnh căn phòng nào?",
            "jump": "room"
          }
        ],
        "departure_follow": [
          {
            "id": "hanh_departure_key",
            "text": "Bà còn giữ chìa khóa của những người đó không?",
            "jump": "key"
          },
          {
            "id": "hanh_departure_erase",
            "text": "Bà từng thử xóa hẳn những cái tên ấy chưa?",
            "jump": "erase"
          }
        ],
        "duplicate_follow": [
          {
            "id": "hanh_duplicate_room",
            "text": "Hai dòng đó có cùng chỉ đến phòng thứ bảy không?",
            "jump": "room"
          },
          {
            "id": "hanh_duplicate_proof",
            "text": "Tôi nên tìm bằng chứng ở đâu?",
            "jump": "proof"
          }
        ]
      }
    },
    "chat_hanh_memory": {
      "meta": {
        "title": "Bà Hạnh — Lời kể được bảo vệ",
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
              "text": "Cậu đã chọn giữ lời khai của Linh riêng tư. Tôi tôn trọng điều đó; có những ký ức chỉ nên được kể khi người mang chúng thấy an toàn."
            },
            {
              "char_id": "hanh",
              "text": "Căn phòng thứ bảy không phải một hồ sơ. Nó là nơi một người từng chờ được gọi tên."
            }
          ],
          "choice_id": "room_ask",
          "choiced": false
        },
        "belongings": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Trong phòng có một chiếc cốc, một tấm ảnh bị úp xuống và dấu bụi hình chữ nhật trên bàn. Tôi không biết món nào được đặt ở đó đầu tiên."
            }
          ],
          "choice_id": "belongings_follow",
          "choiced": false
        },
        "photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tấm ảnh chụp hành lang nhà trọ. Có bảy cánh cửa, nhưng người đứng trước cánh cửa cuối cùng đã bị cắt khỏi ảnh."
            }
          ],
          "choice_id": "photo_follow",
          "choiced": false
        },
        "waiting": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi từng đặt một chiếc cốc thứ hai mỗi tối. Khi nhận ra mình làm vậy, tôi đã cất nó đi. Sáng hôm sau nó lại nằm trên bàn."
            }
          ],
          "choice_id": "waiting_follow",
          "choiced": false
        },
        "back_photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Mặt sau ảnh có dòng chữ: “Đừng khóa cửa khi đủ mười hai”. Không có chữ ký."
            }
          ],
          "choiced": false
        },
        "identity": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi không thể nói người trong ảnh là cậu. Khuôn mặt đã bị cắt, và phần còn lại không đủ để nhận dạng."
            }
          ],
          "choiced": false
        },
        "cup": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Chiếc cốc có vết son môi ở miệng, nhưng tôi sống một mình. Có lẽ căn phòng này từng có người ở cùng tôi."
            }
          ],
          "choiced": false
        },
        "night": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi nghe tiếng chìa khóa xoay vào lúc 03:17. Khi mở cửa, hành lang trống không, nhưng chiếc cốc thứ hai đã được rót đầy."
            }
          ],
          "choiced": false
        },
        "truth": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi sẽ không yêu cầu cậu tin tôi. Hãy giữ tấm ảnh và so sánh nó với ảnh lớp ở trường."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "room_ask": [
          {
            "id": "hanh_room_belongings",
            "text": "Bà có nhớ những món đồ ấy từng thuộc về người bà chờ không?",
            "jump": "belongings"
          },
          {
            "id": "hanh_room_photo",
            "text": "Bà nhớ gì khi nhìn lại bức ảnh hành lang?",
            "jump": "photo"
          },
          {
            "id": "hanh_room_waiting",
            "text": "Bà có thể kể về người bà từng chờ, nếu điều đó không quá khó?",
            "jump": "waiting"
          }
        ],
        "belongings_follow": [
          {
            "id": "hanh_belongings_photo",
            "text": "Tấm ảnh có manh mối gì ở mặt sau?",
            "jump": "back_photo"
          },
          {
            "id": "hanh_belongings_identity",
            "text": "Bà có nhận ra người từng ở đây không?",
            "jump": "identity"
          }
        ],
        "photo_follow": [
          {
            "id": "hanh_photo_cup",
            "text": "Chiếc cốc thứ hai có liên quan đến căn phòng không?",
            "jump": "cup"
          },
          {
            "id": "hanh_photo_night",
            "text": "Bà có nghe thấy ai trở lại vào ban đêm?",
            "jump": "night"
          }
        ],
        "waiting_follow": [
          {
            "id": "hanh_waiting_cup",
            "text": "Vì sao bà vẫn đặt hai chiếc cốc?",
            "jump": "cup"
          },
          {
            "id": "hanh_waiting_truth",
            "text": "Tôi nên làm gì với những gì tìm thấy ở đây?",
            "jump": "truth"
          }
        ]
      }
    },
    "chat_hanh_evidence": {
      "meta": {
        "title": "Bà Hạnh — Hồ sơ đối chiếu",
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
              "text": "Cậu đã giữ sổ ở trường. Tôi có thể đối chiếu căn phòng này với bản ghi, nhưng đừng nghĩ tài liệu sẽ khiến người ta thôi sợ."
            },
            {
              "char_id": "hanh",
              "text": "Nếu cậu công khai nó, hãy nhớ người sống vẫn phải ở lại trong ngôi làng này sau khi sự thật được ghi ra."
            }
          ],
          "choice_id": "room_ask",
          "choiced": false
        },
        "belongings": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Trong phòng có một chiếc cốc, một tấm ảnh bị úp xuống và dấu bụi hình chữ nhật trên bàn. Tôi không biết món nào được đặt ở đó đầu tiên."
            }
          ],
          "choice_id": "belongings_follow",
          "choiced": false
        },
        "photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tấm ảnh chụp hành lang nhà trọ. Có bảy cánh cửa, nhưng người đứng trước cánh cửa cuối cùng đã bị cắt khỏi ảnh."
            }
          ],
          "choice_id": "photo_follow",
          "choiced": false
        },
        "waiting": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi từng đặt một chiếc cốc thứ hai mỗi tối. Khi nhận ra mình làm vậy, tôi đã cất nó đi. Sáng hôm sau nó lại nằm trên bàn."
            }
          ],
          "choice_id": "waiting_follow",
          "choiced": false
        },
        "back_photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Mặt sau ảnh có dòng chữ: “Đừng khóa cửa khi đủ mười hai”. Không có chữ ký."
            }
          ],
          "choiced": false
        },
        "identity": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi không thể nói người trong ảnh là cậu. Khuôn mặt đã bị cắt, và phần còn lại không đủ để nhận dạng."
            }
          ],
          "choiced": false
        },
        "cup": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Chiếc cốc có vết son môi ở miệng, nhưng tôi sống một mình. Có lẽ căn phòng này từng có người ở cùng tôi."
            }
          ],
          "choiced": false
        },
        "night": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi nghe tiếng chìa khóa xoay vào lúc 03:17. Khi mở cửa, hành lang trống không, nhưng chiếc cốc thứ hai đã được rót đầy."
            }
          ],
          "choiced": false
        },
        "truth": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi sẽ không yêu cầu cậu tin tôi. Hãy giữ tấm ảnh và so sánh nó với ảnh lớp ở trường."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "room_ask": [
          {
            "id": "hanh_room_belongings",
            "text": "Sổ ghi chép có xác định chủ nhân những món đồ trong phòng không?",
            "jump": "belongings"
          },
          {
            "id": "hanh_room_photo",
            "text": "Tôi muốn đối chiếu bức ảnh hành lang với sổ. Có chi tiết nào bà biết?",
            "jump": "photo"
          },
          {
            "id": "hanh_room_waiting",
            "text": "Sổ có ghi người từng được chờ trong căn phòng này không?",
            "jump": "waiting"
          }
        ],
        "belongings_follow": [
          {
            "id": "hanh_belongings_photo",
            "text": "Tấm ảnh có manh mối gì ở mặt sau?",
            "jump": "back_photo"
          },
          {
            "id": "hanh_belongings_identity",
            "text": "Bà có nhận ra người từng ở đây không?",
            "jump": "identity"
          }
        ],
        "photo_follow": [
          {
            "id": "hanh_photo_cup",
            "text": "Chiếc cốc thứ hai có liên quan đến căn phòng không?",
            "jump": "cup"
          },
          {
            "id": "hanh_photo_night",
            "text": "Bà có nghe thấy ai trở lại vào ban đêm?",
            "jump": "night"
          }
        ],
        "waiting_follow": [
          {
            "id": "hanh_waiting_cup",
            "text": "Vì sao bà vẫn đặt hai chiếc cốc?",
            "jump": "cup"
          },
          {
            "id": "hanh_waiting_truth",
            "text": "Tôi nên làm gì với những gì tìm thấy ở đây?",
            "jump": "truth"
          }
        ]
      }
    },
    "chat_hanh_room": {
      "meta": {
        "title": "Bà Hạnh — Căn phòng thứ bảy",
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
              "text": "Cậu đã mở được căn phòng đó. Vậy là điều tôi cố quên vẫn còn ở đây."
            },
            {
              "char_id": "hanh",
              "text": "Tôi không định ngăn cậu vào. Tôi chỉ không muốn cậu nghĩ mọi thứ trong phòng đều thuộc về người mang tên mình."
            }
          ],
          "choice_id": "room_ask",
          "choiced": false
        },
        "belongings": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Trong phòng có một chiếc cốc, một tấm ảnh bị úp xuống và dấu bụi hình chữ nhật trên bàn. Tôi không biết món nào được đặt ở đó đầu tiên."
            }
          ],
          "choice_id": "belongings_follow",
          "choiced": false
        },
        "photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tấm ảnh chụp hành lang nhà trọ. Có bảy cánh cửa, nhưng người đứng trước cánh cửa cuối cùng đã bị cắt khỏi ảnh."
            }
          ],
          "choice_id": "photo_follow",
          "choiced": false
        },
        "waiting": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi từng đặt một chiếc cốc thứ hai mỗi tối. Khi nhận ra mình làm vậy, tôi đã cất nó đi. Sáng hôm sau nó lại nằm trên bàn."
            }
          ],
          "choice_id": "waiting_follow",
          "choiced": false
        },
        "back_photo": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Mặt sau ảnh có dòng chữ: “Đừng khóa cửa khi đủ mười hai”. Không có chữ ký."
            }
          ],
          "choiced": false
        },
        "identity": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi không thể nói người trong ảnh là cậu. Khuôn mặt đã bị cắt, và phần còn lại không đủ để nhận dạng."
            }
          ],
          "choiced": false
        },
        "cup": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Chiếc cốc có vết son môi ở miệng, nhưng tôi sống một mình. Có lẽ căn phòng này từng có người ở cùng tôi."
            }
          ],
          "choiced": false
        },
        "night": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi nghe tiếng chìa khóa xoay vào lúc 03:17. Khi mở cửa, hành lang trống không, nhưng chiếc cốc thứ hai đã được rót đầy."
            }
          ],
          "choiced": false
        },
        "truth": {
          "line": [
            {
              "char_id": "hanh",
              "text": "Tôi sẽ không yêu cầu cậu tin tôi. Hãy giữ tấm ảnh và so sánh nó với ảnh lớp ở trường."
            }
          ],
          "choiced": false
        }
      },
      "choice": {
        "room_ask": [
          {
            "id": "hanh_room_belongings",
            "text": "Tôi đã vào phòng. Bà có thể nói những món đồ này từng thuộc về ai không?",
            "jump": "belongings"
          },
          {
            "id": "hanh_room_photo",
            "text": "Bức ảnh trong phòng có điều gì bà vẫn chưa muốn nói?",
            "jump": "photo"
          },
          {
            "id": "hanh_room_waiting",
            "text": "Bà đã chờ ai trong căn phòng này—và người ấy có trở về không?",
            "jump": "waiting"
          }
        ],
        "belongings_follow": [
          {
            "id": "hanh_belongings_photo",
            "text": "Tấm ảnh có manh mối gì ở mặt sau?",
            "jump": "back_photo"
          },
          {
            "id": "hanh_belongings_identity",
            "text": "Bà có nhận ra người từng ở đây không?",
            "jump": "identity"
          }
        ],
        "photo_follow": [
          {
            "id": "hanh_photo_cup",
            "text": "Chiếc cốc thứ hai có liên quan đến căn phòng không?",
            "jump": "cup"
          },
          {
            "id": "hanh_photo_night",
            "text": "Bà có nghe thấy ai trở lại vào ban đêm?",
            "jump": "night"
          }
        ],
        "waiting_follow": [
          {
            "id": "hanh_waiting_cup",
            "text": "Vì sao bà vẫn đặt hai chiếc cốc?",
            "jump": "cup"
          },
          {
            "id": "hanh_waiting_truth",
            "text": "Tôi nên làm gì với những gì tìm thấy ở đây?",
            "jump": "truth"
          }
        ]
      }
    },
    "chat_notice_history": {
      "meta": {
        "title": "Thông báo sơ tán — Bản lưu phát thanh",
        "loop": false,
        "sender": "$communication",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "$communication",
              "text": "THÔNG BÁO SƠ TÁN — mười bảy năm trước. Toàn bộ cư dân có tên trong danh sách phải tập trung tại quảng trường trước 03:17."
            },
            {
              "char_id": "$communication",
              "text": "Đội sơ tán xác nhận đã tiếp nhận mười hai người. Không tự ý tách đoàn. Người phụ trách phải đối chiếu tên với sổ điểm danh trước khi rời làng."
            },
            {
              "char_id": "$communication",
              "text": "Bản lưu thứ hai ghi nhận mười một người lên chuyến xe. Dòng thứ mười hai trên bản niêm phong đã bị cạo bỏ; không có chữ ký xác nhận việc sửa danh sách."
            },
            {
              "char_id": "$communication",
              "text": "Mọi khiếu nại về số người phải gửi cho người quản lý nhà trọ. Bảng thông báo sẽ được thay mới sau khi hoàn tất sơ tán."
            }
          ],
          "choice_id": "history_ack",
          "choiced": false
        }
      },
      "choice": {
        "history_ack": [
          {
            "id": "notice_history_acknowledge",
            "text": "Tôi đã đọc xong bản thông báo.",
            "jump": null
          }
        ]
      }
    },
    "chat_notice_memory": {
      "meta": {
        "title": "Bảng thông báo — Phần ký ức còn sót",
        "loop": false,
        "sender": "$communication",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "$communication",
              "text": "BẢN ĐỐI CHIẾU — chỉ được mở khi người đọc có thể nhớ lại đầy đủ danh sách."
            },
            {
              "char_id": "$communication",
              "text": "Bản gốc ghi mười hai người được bàn giao tại quảng trường. Bản sao gửi về huyện chỉ ghi mười một."
            },
            {
              "char_id": "$communication",
              "text": "Ở mép giấy còn vết hằn của một cái tên. Nét chữ bị cạo đi nhưng áp lực bút vẫn in trên tờ giấy phía dưới."
            },
            {
              "char_id": "$communication",
              "text": "Dòng cuối cùng không có trong bản lưu chính thức: “Người bị xóa không được xem là đã rời đi. Hãy hỏi người giữ chìa khóa nhà trọ.”"
            }
          ],
          "choice_id": "memory_choice",
          "choiced": false
        }
      },
      "choice": {
        "memory_choice": [
          {
            "id": "notice_memory_recall",
            "text": "Tôi nhớ lại được thứ gì đó…",
            "jump": null,
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_read_notice",
                "property": "display",
                "value": "hide"
              }
            ]
          },
          {
            "id": "notice_memory_forget",
            "text": "Tôi mong sao quên đi tất cả…",
            "jump": null,
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_read_notice",
                "property": "display",
                "value": "hide"
              }
            ]
          }
        ]
      }
    },
    "chat_hanh_notice": {
      "meta": {
        "title": "Bà Hạnh — Bản thông báo bị giữ lại",
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
              "text": "Tôi từng giữ lại một bản thông báo khác sau đêm sơ tán. Bản ấy không được phát qua loa, vì nó ghi một điều mà danh sách chính thức không thừa nhận."
            },
            {
              "char_id": "hanh",
              "text": "Tôi không thể đưa nó cho cậu trước khi cậu tự đọc bản ở quảng trường. Nếu muốn biết phần còn lại, hãy quay lại đó và nhìn kỹ những dòng bị cạo."
            }
          ],
          "choice_id": "notice_return",
          "choiced": false
        }
      },
      "choice": {
        "notice_return": [
          {
            "id": "hanh_notice_return_read",
            "text": "Tôi sẽ quay lại quảng trường và đọc phần còn lại.",
            "jump": null,
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_read_notice",
                "property": "display",
                "value": "show"
              }
            ]
          },
          {
            "id": "hanh_notice_verify",
            "text": "Tôi muốn tự đối chiếu, không chỉ nghe lời kể.",
            "jump": null,
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_read_notice",
                "property": "display",
                "value": "show"
              }
            ]
          }
        ]
      }
    },
    "chat_linh": {
      "meta": {
        "title": "Linh — Chỗ ngồi bị xóa",
        "loop": false,
        "sender": "linh",
        "entry": "start",
        "to": [
          "player"
        ]
      },
      "block": {
        "start": {
          "line": [
            {
              "char_id": "linh",
              "text": "Anh tìm thấy ảnh rồi à? Đừng nhìn chỗ bị xé vội. Đếm ghế trước đi—đôi khi thứ còn nguyên lại nói nhiều hơn thứ bị mất."
            },
            {
              "char_id": "linh",
              "text": "Trong lớp hôm đó có mười hai chỗ ngồi. Cô giáo chỉ gọi tên mười một người."
            }
          ],
          "choice_id": "linh_ask",
          "choiced": false
        },
        "photo": {
          "line": [
            {
              "char_id": "linh",
              "text": "Em đứng ở hàng thứ hai. Chỗ bên cạnh em luôn có một chiếc cặp màu xanh, nhưng trong ảnh nó bị cắt mất cùng một người."
            }
          ],
          "choice_id": "photo_follow",
          "choiced": false
        },
        "name": {
          "line": [
            {
              "char_id": "linh",
              "text": "Em nhớ tên người đó bắt đầu bằng chữ L. Nhưng mỗi lần viết ra, nét cuối cùng lại biến thành một vệt đen."
            }
          ],
          "choice_id": "name_follow",
          "choiced": false
        },
        "teacher": {
          "line": [
            {
              "char_id": "linh",
              "text": "Cô giáo dừng ở số thứ mười một. Cô nhìn xuống sổ, rồi nhìn vào chiếc ghế trống. Sau đó cô bảo cả lớp đọc lại từ đầu."
            }
          ],
          "choice_id": "teacher_follow",
          "choiced": false
        },
        "color": {
          "line": [
            {
              "char_id": "linh",
              "text": "Chiếc cặp màu xanh có một miếng vá hình ngôi sao. Em đã khâu nó vào hôm trước ngày sơ tán."
            }
          ],
          "choice_id": "photo_stage1",
          "choiced": false
        },
        "seat": {
          "line": [
            {
              "char_id": "linh",
              "text": "Chỗ ngồi ấy không trống. Có người ngồi đó, nhưng khi chụp ảnh mọi người đều quay mặt về phía máy ảnh như thể không thấy."
            }
          ],
          "choice_id": "photo_stage1",
          "choiced": false
        },
        "letters": {
          "line": [
            {
              "char_id": "linh",
              "text": "Em từng viết tên ấy lên bảng. Khi quay lại, chữ đã bị lau sạch, nhưng bụi phấn vẫn còn vết lõm."
            }
          ],
          "choice_id": "name_stage1",
          "choiced": false
        },
        "roll": {
          "line": [
            {
              "char_id": "linh",
              "text": "Sổ điểm danh có mười hai dòng. Dòng cuối không bị xé; nó bị phủ một lớp mực dày đến mức giấy gần thủng."
            }
          ],
          "choice_id": "name_stage1",
          "choiced": false
        },
        "fear": {
          "line": [
            {
              "char_id": "linh",
              "text": "Em sợ nếu đọc đúng tên, người đó sẽ phải quay lại. Nhưng em cũng sợ nếu không ai đọc, người đó sẽ biến mất lần nữa."
            }
          ],
          "choice_id": "teacher_stage1",
          "choiced": false
        },
        "proof": {
          "line": [
            {
              "char_id": "linh",
              "text": "Hãy lấy bản sao sổ điểm danh và so với tấm ảnh. Đừng chỉ dựa vào điều em nhớ."
            }
          ],
          "choice_id": "teacher_stage1",
          "choiced": false
        },
        "stage1": {
          "line": [
            {
              "char_id": "linh",
              "text": "Anh nghe em kể khá nhiều rồi. Em không muốn anh chọn ngay khi chỉ mới nghe một phía."
            },
            {
              "char_id": "linh",
              "text": "Nhưng nếu phải quyết định cách giữ chuyện này, anh có thể chọn: để lời em được giữ riêng, hay cho phép người khác đối chiếu nó với hồ sơ."
            }
          ],
          "choice_id": "linh_stage1",
          "choiced": false
        },
        "memory_route": {
          "line": [
            {
              "char_id": "linh",
              "text": "Anh chọn bảo vệ ký ức của em. Cảm ơn anh. Nhưng giữ riêng không có nghĩa là bỏ qua những dấu vết còn lại."
            },
            {
              "char_id": "linh",
              "text": "Có vài việc anh vẫn có thể làm—đừng ép chúng thành bằng chứng trước khi em sẵn sàng."
            }
          ],
          "choice_id": "linh_route_follow",
          "choiced": false
        },
        "evidence_route": {
          "line": [
            {
              "char_id": "linh",
              "text": "Anh muốn đối chiếu lời em với hồ sơ. Em hiểu, dù em vẫn sợ những gì giấy tờ có thể làm với một ký ức."
            },
            {
              "char_id": "linh",
              "text": "Nếu đi theo cách ấy, hãy kiểm tra từng dấu vết. Đừng để một bản ghi quyết định thay tất cả."
            }
          ],
          "choice_id": "linh_route_follow",
          "choiced": false
        },
        "stage2": {
          "line": [
            {
              "char_id": "linh",
              "text": "Dù anh chọn cách nào, vẫn còn một điều em nhớ rất rõ: con đường phía sau trường dẫn đến đường hầm."
            },
            {
              "char_id": "linh",
              "text": "Em không chắc mình nhớ đường hầm vì đã đi qua đó, hay vì ai đó từng kể. Anh muốn tin chi tiết ấy, hay muốn xem nó như một dấu để kiểm tra?"
            }
          ],
          "choice_id": "linh_stage2",
          "choiced": false
        },
        "stage3": {
          "line": [
            {
              "char_id": "linh",
              "text": "Cảm ơn anh đã không bắt em kể hết ngay từ đầu. Có những ký ức trở lại từng mảnh, và em cần thời gian để nhận ra chúng có thuộc về mình không."
            },
            {
              "char_id": "linh",
              "text": "Mình đã có thêm một mảnh. Nhưng còn một điều cuối cùng: anh muốn giúp em ghép ký ức ấy lại, hay để nó ở trạng thái chưa hoàn chỉnh?"
            }
          ],
          "choice_id": "linh_stage3",
          "choiced": false
        },
        "final": {
          "line": [
            {
              "char_id": "linh",
              "text": "Vậy là em đã nói hết những gì có thể nói lúc này. Anh đừng xem một lời kể là toàn bộ sự thật; hãy đối chiếu nó với những gì tìm thấy ở trường."
            },
            {
              "char_id": "linh",
              "text": "Em sẽ ở đây. Nếu anh tìm được điều gì mới, hãy quay lại—có thể lúc ấy em sẽ nhớ thêm."
            }
          ],
          "choiced": false
        },
        "stage4": {
          "line": [
            {
              "char_id": "linh",
              "text": "Mình đã lần theo những dấu vết ấy. Nếu anh muốn, giờ có thể thử ghép lại phần ký ức cuối cùng—nhưng không cần ép nó phải hoàn chỉnh."
            }
          ],
          "choice_id": "linh_stage4",
          "choiced": false
        }
      },
      "choice": {
        "linh_ask": [
          {
            "id": "linh_photo",
            "text": "Em nhớ gì về người bị cắt khỏi bức ảnh?",
            "jump": "photo"
          },
          {
            "id": "linh_name",
            "text": "Em có nhớ tên người đó không?",
            "jump": "name"
          },
          {
            "id": "linh_teacher",
            "text": "Cô giáo đã làm gì khi đến dòng cuối?",
            "jump": "teacher"
          }
        ],
        "photo_follow": [
          {
            "id": "linh_photo_color",
            "text": "Chiếc cặp màu xanh có đặc điểm gì?",
            "jump": "color"
          },
          {
            "id": "linh_photo_seat",
            "text": "Em có chắc đã có người ngồi ở đó?",
            "jump": "seat"
          }
        ],
        "name_follow": [
          {
            "id": "linh_name_letters",
            "text": "Em đã từng viết cái tên ấy ở đâu?",
            "jump": "letters"
          },
          {
            "id": "linh_name_roll",
            "text": "Sổ điểm danh có ghi tên đó không?",
            "jump": "roll"
          }
        ],
        "teacher_follow": [
          {
            "id": "linh_teacher_fear",
            "text": "Em sợ điều gì nếu đọc đúng tên?",
            "jump": "fear"
          },
          {
            "id": "linh_teacher_proof",
            "text": "Làm sao kiểm chứng ký ức của em?",
            "jump": "proof"
          }
        ],
        "photo_stage1": [
          {
            "id": "linh_photo_continue1",
            "text": "Em còn nhớ thêm chi tiết nào khác không?",
            "jump": "stage1"
          },
          {
            "id": "linh_photo_continue2",
            "text": "Anh muốn nghe em kể thêm trước khi quyết định.",
            "jump": "stage1"
          }
        ],
        "name_stage1": [
          {
            "id": "linh_name_continue1",
            "text": "Em cứ kể tiếp, chưa cần phải chọn ngay.",
            "jump": "stage1"
          },
          {
            "id": "linh_name_continue2",
            "text": "Anh sẽ không kết luận chỉ từ một cái tên.",
            "jump": "stage1"
          }
        ],
        "teacher_stage1": [
          {
            "id": "linh_teacher_continue1",
            "text": "Anh muốn nghe thêm trước khi đưa ra quyết định.",
            "jump": "stage1"
          },
          {
            "id": "linh_teacher_continue2",
            "text": "Em không cần phải trả lời vội.",
            "jump": "stage1"
          }
        ],
        "linh_stage1": [
          {
            "id": "linh_protect_memory",
            "text": "Anh sẽ giữ kín lời khai của em, không biến ký ức riêng thành vật chứng công khai.",
            "jump": "memory_route",
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_recover_class_register",
                "property": "display",
                "value": "hide"
              },
              {
                "type": "set",
                "subtype": "action",
                "target": "action_reach_station",
                "property": "display",
                "value": "hide"
              },
              {
                "type": "set",
                "subtype": "action",
                "target": "action_decode_roster",
                "property": "display",
                "value": "hide"
              },
              {
                "type": "set",
                "subtype": "action",
                "target": "action_overlay_map",
                "property": "display",
                "value": "hide"
              },
              {
                "type": "set",
                "subtype": "action",
                "target": "action_reach_station_memory",
                "property": "display",
                "value": "show"
              }
            ]
          },
          {
            "id": "linh_allow_evidence",
            "text": "Anh sẽ cho phép đối chiếu lời em với hồ sơ, nhưng không xem hồ sơ là toàn bộ sự thật.",
            "jump": "evidence_route",
            "effect": [
              {
                "type": "set",
                "subtype": "action",
                "target": "action_reach_station_memory",
                "property": "display",
                "value": "hide"
              }
            ]
          }
        ],
        "linh_route_follow": [
          {
            "id": "linh_route_continue1",
            "text": "Anh sẽ tiếp tục lắng nghe, chưa vội kết luận.",
            "jump": "stage2"
          },
          {
            "id": "linh_route_continue2",
            "text": "Em cứ kể thêm. Quyết định này chưa kết thúc cuộc trò chuyện.",
            "jump": "stage2"
          }
        ],
        "linh_stage2": [
          {
            "id": "linh_commit_memory",
            "text": "Anh sẽ giữ kín lời khai của em, để ký ức được bảo vệ trước khi đối chiếu.",
            "jump": "stage3",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "school_choice",
                "value": "ký ức"
              }
            ]
          },
          {
            "id": "linh_commit_evidence",
            "text": "Anh sẽ cho phép đối chiếu với hồ sơ, nhưng không xem hồ sơ là toàn bộ sự thật.",
            "jump": "stage3",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "school_choice",
                "value": "bằng chứng"
              }
            ]
          }
        ],
        "linh_stage3": [
          {
            "id": "linh_accept_tunnel_memory",
            "text": "Anh sẽ giữ chi tiết đường hầm như một phần ký ức cần được kiểm tra.",
            "jump": "stage4",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "clue_tunnel",
                "value": true
              }
            ]
          },
          {
            "id": "linh_check_tunnel_clue",
            "text": "Anh sẽ xem đường hầm là một dấu vết để đối chiếu, không chỉ là lời kể.",
            "jump": "stage4",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "clue_tunnel",
                "value": true
              }
            ]
          }
        ],
        "linh_stage4": [
          {
            "id": "linh_reconstruct_memory",
            "text": "Mình thử ghép lại ký ức, từng chi tiết một.",
            "jump": "final",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "memory_reconstructed",
                "value": true
              }
            ]
          },
          {
            "id": "linh_reconstruct_carefully",
            "text": "Anh sẽ giúp em nhớ lại, nhưng không ép em phải hoàn tất ngay.",
            "jump": "final",
            "effect": [
              {
                "type": "set",
                "subtype": "state",
                "target": "memory_reconstructed",
                "value": true
              }
            ]
          }
        ]
      }
    }
  },
  "characters": {
    "player": {
      "meta": {
        "name": "An",
        "desc": "An tỉnh dậy tại quảng trường làng mà không nhớ rõ mình đã đến đây bằng cách nào. Tên An xuất hiện trong sổ khách với ngày đến ở tương lai; những người trong làng dường như nhận ra An, nhưng mỗi người nhớ một phiên bản khác nhau. Trong hồ sơ sơ tán và danh sách lớp, cái tên ấy lại bị cạo xóa, như thể An vừa là người đã đến sau mười bảy năm, vừa là người chưa từng được phép rời đi."
      },
      "set": {
        "linkEffect": false,
        "alert": null,
        "moving": false,
        "move": null
      },
      "stats": {
        "memory": {
          "current": 0,
          "max": 5,
          "label": "Ký ức"
        },
        "composure": {
          "current": 3,
          "max": 5,
          "label": "Bình tĩnh"
        },
        "resolve": {
          "current": 2,
          "max": 5,
          "label": "Ý chí"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_village_square",
        "currentIndex": 0
      },
      "moveList": [],
      "effect": {
        "leave": {}
      }
    },
    "mai": {
      "meta": {
        "name": "Mai",
        "desc": "Người bán hàng trẻ ở quảng trường. Cô thường giữ quầy đóng cửa mỗi khi loa phát thanh đọc tên người mất tích, và luôn đứng cách miệng giếng một khoảng vừa đủ để không phải nhìn xuống. Mai nhớ rõ đêm có mười hai người biến mất, nhưng ký ức của cô bị đứt đoạn đúng lúc người thứ mười hai xuất hiện. Cô không nói dối hoàn toàn; điều cô kể là phần sự thật mà cô có thể chịu đựng."
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
        },
        "guilt": {
          "current": 3,
          "max": 5,
          "label": "Mặc cảm",
          "unknown": true
        },
        "memory": {
          "current": 2,
          "max": 5,
          "label": "Ký ức",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_village_square",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_village_square",
          "countVisited": 0,
          "nextStep": 30
        }
      ]
    },
    "hanh": {
      "meta": {
        "name": "Bà Hạnh",
        "desc": "Chủ nhà trọ, người quản lý chìa khóa và sổ ghi khách đến – khách đi. Bà có thói quen kiểm tra phòng trống trước khi trời tối, dù luôn khẳng định nhà trọ chỉ có sáu phòng. Bà nhớ chính xác những người từng ở lại nhưng không thể nhớ ai đã đặt phòng cho bạn. Sự bình thản của bà giống một quy tắc tự vệ đã được lặp lại quá lâu, hơn là thái độ của người không biết chuyện."
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
        },
        "guilt": {
          "current": 3,
          "max": 5,
          "label": "Mặc cảm",
          "unknown": true
        },
        "knowledge": {
          "current": 4,
          "max": 5,
          "label": "Hiểu biết",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_inn",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_inn",
          "countVisited": 0,
          "nextStep": 45
        }
      ]
    },
    "keeper": {
      "meta": {
        "name": "Người giữ nhà nguyện",
        "desc": "Người đàn ông trông coi nhà nguyện và tháp chuông. Ông nói chuông không dùng để báo giờ mà để gọi những người còn nhớ; vì thế ông không bao giờ rung chuông nếu chưa biết chính xác mình đang gọi ai. Ông hiểu cơ cấu chuông đã bị tháo rời và biết ý nghĩa của ba hồi ngân trong đêm sơ tán. Niềm tin của ông không đem lại sự thanh thản: nó buộc ông phải tiếp tục canh giữ một lời hứa đã quá hạn."
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
        },
        "remorse": {
          "current": 2,
          "max": 5,
          "label": "Day dứt",
          "unknown": true
        },
        "duty": {
          "current": 5,
          "max": 5,
          "label": "Bổn phận"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_chapel",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_chapel",
          "countVisited": 0,
          "nextStep": 60
        }
      ]
    },
    "linh": {
      "meta": {
        "name": "Linh",
        "desc": "Đứa trẻ xuất hiện trong bức ảnh lớp cũ và trong những hành lang tưởng như đã bỏ hoang. Hồ sơ nhà trường không còn tên Linh, nhưng số chỗ ngồi trong ảnh cho thấy từng có một học sinh bị cắt khỏi khung. Linh thường trả lời câu hỏi bằng những chi tiết rất nhỏ – màu phấn, tiếng trống, vị trí chiếc cặp – như thể ký ức lớn hơn đã bị ai đó lấy mất. Không rõ Linh là một nhân chứng còn sống, một ký ức bị giữ lại hay hình ảnh mà ngôi làng tạo ra để lấp chỗ trống."
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
        },
        "fear": {
          "current": 4,
          "max": 5,
          "label": "Sợ hãi",
          "unknown": true
        },
        "trust": {
          "current": 0,
          "max": 5,
          "label": "Tin tưởng"
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_school_classroom_03",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_school_classroom_03",
          "countVisited": 0,
          "nextStep": 35
        }
      ]
    },
    "voice": {
      "meta": {
        "name": "Giọng nói dưới ga",
        "desc": "Một giọng nói phát ra từ đường ray tại sân ga chỉ xuất hiện lúc 03:17. Tín hiệu bị nhiễu, lúc gần như giọng của người thân, lúc giống giọng của chính bạn. Nó biết bạn đã đến muộn mười bảy năm và gọi sự kiện năm ấy là một cuộc sơ tán chưa bao giờ kết thúc. Giọng nói không yêu cầu được cứu ngay; nó muốn bạn xác định ai đã bị xóa khỏi danh sách và liệu sự thật có nên được phát lại cho tất cả những người còn nhớ."
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
        },
        "identity": {
          "current": 1,
          "max": 5,
          "label": "Danh tính",
          "unknown": true
        },
        "memory": {
          "current": 5,
          "max": 5,
          "label": "Ký ức",
          "unknown": true
        }
      },
      "inventory": [],
      "hand": [],
      "relationship": [],
      "met": [],
      "place": {
        "scene_id": "scene_ghost_station",
        "currentIndex": 0
      },
      "moveList": [
        {
          "scene_id": "scene_ghost_station",
          "countVisited": 0,
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
      "desc": "Giữa những tiếng nhiễu, bạn nhận ra giọng nói quen thuộc của người mình luôn tin tưởng nhất. “Anh bảo tôi xóa tên cô ấy. Anh nói nếu còn ai nhớ đến cô ấy, chúng ta sẽ không bao giờ rời khỏi nơi này.” Một khoảng im lặng. “Nhưng anh chưa từng cứu cô ấy. Anh là người đã khóa cánh cửa.” Bản ghi kết thúc. Bạn nhận ra người đã dẫn mình đi tìm sự thật có thể chính là kẻ gây ra bi kịch — và mọi lời họ từng nói với bạn đều có thể là một lời nói dối."
    },
    "ending_depart": {
      "title": "Chuyến Tàu Lúc 03:17",
      "desc": "Bạn lên tàu mà không chọn phe. Tàu rời ga, nhưng trong cửa kính phản chiếu vẫn có một người đứng sau lưng bạn."
    },
    "ending_release_partial": {
      "title": "Giải thoát — ký ức không hoàn chỉnh",
      "desc": "Sự thật được trả lại, nhưng không phải mọi ký ức đều nguyên vẹn. Người bị mắc kẹt không còn bị buộc phải quên; một số chi tiết đã biến mất khỏi mọi bản ghi."
    },
    "ending_release_reconstructed": {
      "title": "Giải thoát — sự thật được tái dựng",
      "desc": "Sự thật được dựng lại từ những dấu vết hỏng, vật chứng bị bỏ quên và các nhân chứng dám đối chiếu ký ức. Không một lời kể đơn lẻ nào quyết định toàn bộ."
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
}