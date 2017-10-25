FROM poet-base

COPY ["./config/retry-eval.json", "/etc/poet/retry-eval.json"]

VOLUME /poet/src

CMD [ "npm", "run", "retry-eval", "--", "-c", "/etc/poet/retry-eval.json" ]
