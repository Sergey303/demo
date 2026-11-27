"""Exercise the real generated API against a fresh, isolated PostgreSQL container."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import threading
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
from urllib import request, error
import uuid

NEW, ACTIVE, DONE = "Новая", "В работе", "Выполнена"

def main(package, evidence):
    dll = package / "backend/bin/Debug/net10.0/BusinessOperationsAdmin.Persistence.dll"
    sql = package / "backend/Migrations/AppForgeGeneratedMigrations.idempotent.sql"
    assert dll.is_file() and sql.is_file()
    name = "appforge-p1-test-" + uuid.uuid4().hex[:8]
    password = secrets.token_urlsafe(24)
    docker = ["docker"]
    network = os.environ.get("P1_TEST_DOCKER_NETWORK")
    db_env = os.environ | {"POSTGRES_PASSWORD": password, "POSTGRES_USER": "workflow", "POSTGRES_DB": "workflow"}
    checks = []
    def check(label, passed):
        if not passed:
            raise AssertionError(label)
        checks.append(label)
        print("PASS", label, flush=True)
    def command(*args, **kwargs):
        return subprocess.run([*docker, *args], check=True, **kwargs)
    with tempfile.TemporaryDirectory(prefix="workflow-live-") as tmp:
        api = None
        started = False
        try:
            command("run", "--rm", "-d", "--name", name, "-e", "POSTGRES_PASSWORD",
                    "-e", "POSTGRES_USER", "-e", "POSTGRES_DB", *(["--network",network] if network else ["-p","127.0.0.1::5432"]),
                    "postgres:17-alpine", env=db_env, stdout=subprocess.DEVNULL)
            started = True
            for _ in range(60):
                p = subprocess.run([*docker,"exec",name,"pg_isready","-h","127.0.0.1","-U","workflow","-d","workflow"],stdout=subprocess.DEVNULL)
                if p.returncode == 0: break
                time.sleep(.5)
            else: raise RuntimeError("PostgreSQL did not start")
            db_host = name if network else "127.0.0.1"
            db_port = 5432 if network else int(command("port", name, "5432/tcp", capture_output=True, text=True).stdout.strip().rsplit(":",1)[1])
            with sql.open("rb") as source:
                command("exec","-i",name,"psql","-U","workflow","-d","workflow","-v","ON_ERROR_STOP=1",
                        stdin=source,stdout=subprocess.DEVNULL)
            with socket.socket() as sock:
                sock.bind(("127.0.0.1",0)); port=sock.getsockname()[1]
            base=f"http://127.0.0.1:{port}"
            login_password="P1!aA"+secrets.token_urlsafe(24)
            env=os.environ | {
                "ASPNETCORE_URLS":base,
                "Cors__AllowedOrigins__0":"https://localhost",
                "ForwardedHeaders__KnownProxies__0":"127.0.0.1",
                "AppForge__Email__Mode":"Smtp",
                "AppForge__Email__Smtp__Host":"127.0.0.1",
                "AppForge__Email__Smtp__Port":"1",
                "AppForge__Email__Smtp__From":"workflow@example.invalid",
                "AppForge__Email__Smtp__EnableSsl":"true",
                "ConnectionStrings__Default":f"Host={db_host};Port={db_port};Database=workflow;Username=workflow;Password={password}",
                "APPFORGE_ADMIN_EMAIL":"workflow@example.invalid",
                "APPFORGE_ADMIN_PASSWORD":login_password,
                "ASPNETCORE_HOSTINGSTARTUPASSEMBLIES":"BusinessOperationsAdmin.Persistence",
                "RateLimiting__Api__PermitLimit":"500"}
            subprocess.run(["dotnet",str(dll),"--appforge-seed-only"],env=env,cwd=dll.parent,check=True,stdout=subprocess.DEVNULL)
            with (Path(tmp)/"api.log").open("wb") as log:
                api=subprocess.Popen(["dotnet",str(dll)],env=env,cwd=dll.parent,stdout=log,stderr=subprocess.STDOUT)
            token=None
            def call(method,path,body=None,expected=200,key=None):
                headers={"Accept":"application/json"}
                if token: headers["Authorization"]="Bearer "+token
                if method in ("POST","PUT","DELETE"): headers["Idempotency-Key"]=key or str(uuid.uuid4())
                data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
                if data: headers["Content-Type"]="application/json"
                try:
                    with request.urlopen(request.Request(base+path,headers=headers,data=data,method=method),timeout=10) as r:
                        status,raw=r.status,r.read()
                except error.HTTPError as e:
                    status,raw=e.code,e.read()
                if expected is None: return status, json.loads(raw) if raw else None
                if status!=expected: raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {raw[:300]!r}")
                return json.loads(raw) if raw else None
            for _ in range(60):
                try: call("GET","/health/ready");break
                except OSError: time.sleep(.25)
            else: raise RuntimeError("API not ready")
            login=call("POST","/api/auth/login",{"login":"workflow@example.invalid","password":login_password})
            token=login["accessToken"]
            if login["user"]["mustChangePassword"]:
                changed="P1!aA"+secrets.token_urlsafe(24)
                call("POST","/api/auth/change-password",{"currentPassword":login_password,"newPassword":changed},204)
                token=call("POST","/api/auth/login",{"login":"workflow@example.invalid","password":changed})["accessToken"]
            check("generated login and isolated PostgreSQL",bool(token))
            def create(resource,body,key=None):return call("POST","/api/"+resource,body,201,key)
            def update(task,expected=200,**patch):
                body={k:v for k,v in task.items() if k!="id"}|patch
                return call("PUT","/api/workitems/"+task["id"],body,expected)
            c=create("customers",{"name":"Север Проект","segment":"Монтаж"})
            r=create("servicerequests",{"customerId":c["id"],"title":"Настройка контроллера","priority":"Высокий"})
            bad=str(uuid.uuid4())
            call("POST","/api/servicerequests",{"customerId":bad,"title":"Нет связи","priority":"Обычный"},400)
            call("POST","/api/workitems",{"serviceRequestId":bad,"title":"Нет связи","status":NEW},400)
            check("invalid FK rejected",True)
            call("POST","/api/workitems",{"serviceRequestId":r["id"],"title":"Прямое завершение","status":DONE,"assignee":"Анна","note":"Готово"},400)
            body={"serviceRequestId":r["id"],"title":"Согласование конфигурации","assignee":None,"status":NEW,"note":None}
            idem=str(uuid.uuid4())
            t=create("workitems",body,idem)
            check("idempotent create replay",t["id"]==create("workitems",body,idem)["id"])
            update(t,400,status=ACTIVE)
            t=update(t,assignee="Анна")
            update(t,400,status=DONE,note="Готово")
            update(t,400,assignee="Неизвестный")
            t=update(t,status=ACTIVE)
            update(t,400,assignee=None)
            update(t,400,status=DONE,note="  ")
            unchanged=call("GET","/api/workitems/"+t["id"])
            check("O12 invalid actions rejected, unchanged",unchanged["status"]==ACTIVE and unchanged["assignee"]=="Анна")
            t=update(t,status=DONE,note="Конфигурация согласована")
            update(t,400,assignee="Илья")
            check("completion and result stored together",t["status"]==DONE and t["note"]=="Конфигурация согласована")
            t=update(t,status=ACTIVE)
            check("O13 reopen preserves result",t["status"]==ACTIVE and t["note"]=="Конфигурация согласована")
            call("DELETE","/api/customers/"+c["id"],expected=400)
            call("DELETE","/api/servicerequests/"+r["id"],expected=400)
            check("parent deletion denied",True)
            clients=call("GET","/api/customers")["items"]
            requests=call("GET","/api/servicerequests")["items"]
            tasks=call("GET","/api/workitems")["items"]
            check("generated list endpoints retain relations",len(clients)==len(requests)==len(tasks)==1 and requests[0]["customerId"]==c["id"] and tasks[0]["serviceRequestId"]==r["id"])
            out=command("exec",name,"psql","-U","workflow","-d","workflow","-qtA","-c",
                        'SELECT "Status", "Note", "Assignee" FROM "WorkItems" WHERE NOT "IsDeleted"',capture_output=True,encoding="utf-8").stdout.strip()
            check("PostgreSQL independently confirms state/result/assignee",out=="В работе|Конфигурация согласована|Анна")
            # Force both PUTs to read the same pre-update row by holding a DB
            # row lock until both are waiting. This exercises different keys.
            task_id=t["id"]
            locker=subprocess.Popen([*docker,"exec","-i",name,"psql","-U","workflow","-d","workflow","-v","ON_ERROR_STOP=1","-qtA"],
                stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8")
            try:
                locker.stdin.write(f"""BEGIN;\nSELECT pg_backend_pid();\nSELECT "Id" FROM "WorkItems" WHERE "Id" = '{task_id}' FOR UPDATE;\nSELECT 'LOCKED';\n""")
                locker.stdin.flush()
                locker_pid=int(locker.stdout.readline().strip())
                assert locker.stdout.readline().strip()==task_id
                assert locker.stdout.readline().strip()=="LOCKED"
                barrier=threading.Barrier(2)
                race_keys=[str(uuid.uuid4()),str(uuid.uuid4())]
                race_bodies=[{k:v for k,v in t.items() if k!="id"}|patch for patch in ({"status":DONE,"note":"Concurrent completion"},{"assignee":"Илья"})]
                def race(i):
                    barrier.wait(timeout=5)
                    return call("PUT","/api/workitems/"+task_id,race_bodies[i],expected=None,key=race_keys[i])
                with ThreadPoolExecutor(max_workers=2) as pool:
                    a=pool.submit(race,0)
                    b=pool.submit(race,1)
                    waiting=0
                    for _ in range(40):
                        waiting=int(command("exec",name,"psql","-U","workflow","-d","workflow","-qtA","-c",
                            f"WITH RECURSIVE blocked(pid) AS (SELECT {locker_pid} UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid)) WHERE a.datname='workflow') SELECT count(*)-1 FROM blocked",capture_output=True,encoding="utf-8").stdout.strip())
                        if waiting>=2: break
                        time.sleep(.05)
                    locker.stdin.write("COMMIT;\n\\q\n");locker.stdin.flush()
                    results=[a.result(timeout=12),b.result(timeout=12)]
                    statuses=[r[0] for r in results]
                    print("RACE",statuses,"waiting",waiting,flush=True)
                check("two concurrent distinct-key writes reached database lock",waiting>=2)
                check("one concurrent write wins and stale write conflicts",sorted(statuses)==[200,409])
                winner=statuses.index(200)
                loser=1-winner
                check("stale task has explicit conflict code",results[loser][1]["code"]=="workflow.stale_task")
                receipt_sql=f"""SELECT "IdempotencyKey" FROM "__AppForgeRestMutationReceipts" WHERE "IdempotencyKey" IN ('{race_keys[0]}','{race_keys[1]}') AND "ResponseJson" IS NOT NULL"""
                receipts=command("exec",name,"psql","-U","workflow","-d","workflow","-qtA","-c",receipt_sql,capture_output=True,encoding="utf-8").stdout.strip().splitlines()
                all_sql=receipt_sql.replace(' AND "ResponseJson" IS NOT NULL','')
                all_receipts=command("exec",name,"psql","-U","workflow","-d","workflow","-qtA","-c",all_sql,capture_output=True,encoding="utf-8").stdout.strip().splitlines()
                check("winner receipt committed, losing receipt rolled back",receipts==all_receipts==[race_keys[winner]])
                replay=call("PUT","/api/workitems/"+task_id,race_bodies[winner],key=race_keys[winner])
                check("winner replay returns original result",replay==results[winner][1])
                after=call("GET","/api/workitems/"+task_id)
                check("race preserves winner state and result", (statuses[0]==200 and after["status"]==DONE and after["note"]=="Concurrent completion" and after["assignee"]=="Анна") or (statuses[1]==200 and after["status"]==ACTIVE and after["assignee"]=="Илья" and after["note"]==t["note"]))
            finally:
                if locker.poll() is None:
                    locker.terminate()
                locker.communicate(timeout=5)
            evidence.write_text(json.dumps({"status":"PASS","kind":"generated HTTP API + disposable PostgreSQL","checks":checks,
                "limitations":["controlled server read-to-write race; no client revision or general concurrency guarantee","demo identities not ACL","no live browser or production deployment claim"]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        finally:
            if api:
                api.terminate()
                try: api.wait(timeout=10)
                except subprocess.TimeoutExpired: api.kill();api.wait()
            if started:
                command("stop",name,stdout=subprocess.DEVNULL)

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("package",type=Path)
    parser.add_argument("evidence",type=Path)
    args=parser.parse_args()
    main(args.package.resolve(),args.evidence.resolve())
